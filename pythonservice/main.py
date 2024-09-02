import pika
import json
from flask import Flask, request, jsonify
import threading
import cv2
import numpy as np
import requests
app = Flask(__name__)

# RabbitMQ bağlantısı
connection = pika.BlockingConnection(pika.ConnectionParameters(
    host='localhost',
    credentials=pika.PlainCredentials('user', 'password')))
channel = connection.channel()

# Kuyruk oluştur
channel.queue_declare(queue='math_queue',durable=True)
channel.queue_declare(queue='image_queue', durable=True)

def add_numbers(x, y):
    return x + y
# İnsan tespiti için kullanılan fonksiyon
def detect_human_in_image(image_url):
    # Resmi URL'den indir
    response = requests.get(image_url)
    image_array = np.frombuffer(response.content, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    # İnsanları tespit etmek için HOG ve SVM kullanan bir model yükle
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    # İnsan tespiti yap
    (humans, _) = hog.detectMultiScale(image, winStride=(8, 8), padding=(16, 16), scale=1.05)

    # İnsan bulunmuşsa True, değilse False döndür
    return len(humans) > 0
# RabbitMQ'dan gelen mesajları işle
def callback(ch, method, properties, body):
    try:
        message = json.loads(body)
        if 'pattern' not in message or 'data' not in message:
            raise ValueError("Invalid message format")
        
        data = message['data']
        if 'x' not in data or 'y' not in data:
            raise ValueError("Missing 'x' or 'y' in the received data")
        
        result = add_numbers(data['x'], data['y'])
        print(f"Received {data['x']} and {data['y']}, sum is {result}")
        
        # Sonucu geri gönder
        channel.basic_publish(exchange='',
                              routing_key=properties.reply_to,
                              properties=pika.BasicProperties(correlation_id = properties.correlation_id),
                              body=json.dumps({"result": result}))
    except json.JSONDecodeError:
        print("Invalid JSON received")
    except ValueError as e:
        print(str(e))
    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)
def callback_image(ch, method, properties, body):
    try:
        message = json.loads(body)
        if 'pattern' not in message or 'data' not in message:
            raise ValueError("Invalid message format")
        
        data = message['data']
        if 'media' not in data:
            raise ValueError("Missing 'media' in the received data")

        results = []
        for item in data['media']:
            if 'url' in item and 'type' in item and item['type'] == 'image':
                image_url = item['url']
                human_detected = detect_human_in_image(image_url)
                result = {
                    "url": image_url,
                    "human_detected": "human_detected" if human_detected else "no_human_detected"
                }
                results.append(result)

        # Sonucu geri gönder
        channel.basic_publish(
            exchange='',
            routing_key=properties.reply_to,
            properties=pika.BasicProperties(correlation_id=properties.correlation_id),
            body=json.dumps({"results": results})
        )
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error processing message: {str(e)}")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)
channel.basic_consume(queue='math_queue', on_message_callback=callback)
channel.basic_consume(queue='image_queue', on_message_callback=callback_image)
# HTTP endpoint
@app.route('/add', methods=['POST'])
def add():
    try:
        data = request.json
        if 'x' not in data or 'y' not in data:
            return jsonify({"error": "Missing 'x' or 'y' in the request"}), 400
        result = add_numbers(data['x'], data['y'])
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# HTTP endpoint
@app.route('/check_human', methods=['POST'])
def check_human():
    try:
        data = request.json
        if 'media' not in data:
            return jsonify({"error": "Missing 'media' in the request"}), 400
        
        media = data['media']
        results = []

        for item in media:
            if 'url' in item and 'type' in item and item['type'] == 'image':
                image_url = item['url']
                human_detected = detect_human_in_image(image_url)
                result = {
                    "url": image_url,
                    "human_detected": "human_detected" if human_detected else "no_human_detected"
                }
                results.append(result)

        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RabbitMQ tüketiciyi ayrı bir thread'de başlat
def start_consuming():
    channel.start_consuming()

if __name__ == '__main__':
    # RabbitMQ tüketiciyi başlat
    threading.Thread(target=start_consuming, daemon=True).start()
    
    # Flask uygulamasını başlat
    app.run(port=5000)