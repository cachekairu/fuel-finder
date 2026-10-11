import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/style.css")
def style():
    return send_from_directory(BASE_DIR, "style.css")

@app.route("/script.js")
def script():
    return send_from_directory(BASE_DIR, "script.js")

@app.route("/test")
def test():
    return jsonify({
        "status": "Fuel Finder backend is working!"
    })

@app.route("/estimate-price", methods=["POST"])
def estimate_price():
    data = request.get_json(silent=True) or {}
    station_name = str(data.get("station", "")).strip()
    location = str(data.get("location", "")).strip()

    if not station_name:
        return jsonify({"error": "Station name is required."}), 400

    try:
        # Pinalitan ng tamang active model para sa Gemini API
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Provide realistic estimated current retail fuel prices in Philippine Pesos (PHP) per liter "
            f"for '{station_name}' located at '{location}'. "
            f"Give estimates for Reg 91, Pre 95, and Diesel based on current typical market prices in the Philippines. "
            f"Return the response strictly as a short, clean text string like: 'Reg 91: ₱58.50 | Pre 95: ₱61.00 | Diesel: ₱53.50'."
        )

        response = model.generate_content(prompt)
        estimated_text = response.text.strip()

        return jsonify({
            "success": True,
            "result": estimated_text
        })
    except Exception as error:
        print("Gemini price estimation error:", error)
        return jsonify({
            "success": False,
            "error": "Unable to generate price estimation."
        }), 500

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )