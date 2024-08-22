import pika
import json
from flask import Flask, request, jsonify
import threading

app = Flask(__name__)

# RabbitMQ bağlantısı
connection = pika.BlockingConnection(pika.ConnectionParameters(
    host='localhost',
    credentials=pika.PlainCredentials('user', 'password')))
channel = connection.channel()

# Kuyruk oluştur
channel.queue_declare(queue='math_queue',durable=True)

def add_numbers(x, y):
    return x + y

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

channel.basic_consume(queue='math_queue', on_message_callback=callback)

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

# RabbitMQ tüketiciyi ayrı bir thread'de başlat
def start_consuming():
    channel.start_consuming()

if __name__ == '__main__':
    # RabbitMQ tüketiciyi başlat
    threading.Thread(target=start_consuming, daemon=True).start()
    
    # Flask uygulamasını başlat
    app.run(port=5000)