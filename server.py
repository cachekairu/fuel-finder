import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from google import genai

app = Flask(__name__)
CORS(app)

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

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"success": False, "error": "GEMINI_API_KEY is missing"}), 500

    try:
        client = genai.Client(api_key=api_key)
        prompt = (
            f"Provide realistic estimated current retail fuel prices in Philippine Pesos (PHP) per liter "
            f"for '{station_name}' located at '{location}'. "
            f"Give estimates for Reg 91, Pre 95, and Diesel based on current typical market prices in the Philippines. "
            f"Return the response strictly as a short, clean text string like: 'Reg 91: ₱58.50 | Pre 95: ₱61.00 | Diesel: ₱53.50'."
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        estimated_text = response.text.strip()

        return jsonify({
            "success": True,
            "result": estimated_text
        })
    except Exception as error:
        print("Gemini price estimation error:", str(error))
        return jsonify({
            "success": False,
            "error": str(error)
        }), 500

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )