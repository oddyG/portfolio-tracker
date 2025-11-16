#!/usr/bin/env python3
"""
Flask Web Server for DeBank Portfolio Tracker
Three separate buckets: ETH, BTC, and Stablecoins
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import os
import json
import requests
from datetime import datetime
import pytz
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)

# HARDCODED CONFIGURATION
DEBANK_API_KEY = "25a3031ffed891bb3805a170fde5a39fd1cc321d"
WALLET_ADDRESS = "0x0a9ee3ff883dde459aa06f9ce817ba072aea722c"

# EMAIL CONFIGURATION
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "oddbjorn@soly.no"
SMTP_PASSWORD = "ppch wrqk oeku zisw"
SENDER_EMAIL = "oddbjorn@soly.no"
RECIPIENT_EMAIL = "oddbjorn@soly.no"

# DeBank API base URL
DEBANK_API_BASE = "https://pro-openapi.debank.com/v1"

# Token categorization - THREE SEPARATE BUCKETS
ETH_TOKENS = {"ETH", "WETH"}
BTC_TOKENS = {"WBTC", "TBTC", "RENBTC", "HBTC", "BTC"}
STABLECOIN_TOKENS = {"USDC", "USDT", "DAI", "FRAX", "TUSD", "BUSD", "USDP", "UST", "GUSD", "USDD", "LUSD"}

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeBank Portfolio Tracker</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    </style>
</head>
<body class="min-h-screen p-6">
    <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">DeBank Portfolio Tracker</h1>
            <p class="text-gray-600">Monitor your crypto portfolio in real-time</p>
            <p class="text-sm text-gray-500 mt-2">Wallet: 0x0a9e...a722c</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <button onclick="runReport()" id="runBtn" class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg transition-all text-xl">
                🚀 Run Portfolio Report Now
            </button>
            <p class="text-center text-gray-500 text-sm mt-3">Configuration is hardcoded in the app</p>
        </div>

        <div id="results" class="hidden">
            <div id="errorBox" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"></div>
            
            <div id="successBox" class="hidden bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6"></div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">ETH Bucket</h3>
                    <p class="text-3xl font-bold" id="ethValue">$0.00</p>
                    <p class="text-sm opacity-80 mt-2">ETH, WETH</p>
                </div>

                <div class="bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">BTC Bucket</h3>
                    <p class="text-3xl font-bold" id="btcValue">$0.00</p>
                    <p class="text-sm opacity-80 mt-2">WBTC, tBTC</p>
                </div>

                <div class="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">Stablecoins</h3>
                    <p class="text-3xl font-bold" id="stablecoinsValue">$0.00</p>
                    <p class="text-sm opacity-80 mt-2">USDC, USDT, DAI</p>
                </div>

                <div class="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">Total Portfolio</h3>
                    <p class="text-3xl font-bold" id="totalValue">$0.00</p>
                    <p class="text-sm opacity-80 mt-2">All assets</p>
                </div>
            </div>

            <div class="bg-white rounded-lg p-4 mt-6 shadow">
                <p class="text-gray-600 text-sm" id="timestamp"></p>
            </div>
        </div>

        <div class="bg-blue-100 border border-blue-400 rounded-lg p-6 mt-6">
            <h3 class="text-blue-800 font-semibold mb-3">ℹ️ Information</h3>
            <ul class="text-blue-700 text-sm space-y-2 list-disc list-inside">
                <li>API keys are hardcoded in the application</li>
                <li>Email will be sent to: oddbjorn@soly.no</li>
                <li>Click the button above to run the report manually</li>
                <li>For automatic daily reports at 12:00, set up a cron job to ping /api/run-report-auto</li>
            </ul>
        </div>
    </div>

    <script>
        async function runReport() {
            const btn = document.getElementById('runBtn');
            btn.disabled = true;
            btn.innerHTML = '⏳ Running...';
            
            document.getElementById('errorBox').classList.add('hidden');
            document.getElementById('successBox').classList.add('hidden');

            try {
                const response = await fetch('/api/run-report-auto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('successBox').innerText = data.message;
                    document.getElementById('successBox').classList.remove('hidden');
                    
                    document.getElementById('ethValue').innerText = '$' + data.eth_bucket.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    document.getElementById('btcValue').innerText = '$' + data.btc_bucket.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    document.getElementById('stablecoinsValue').innerText = '$' + data.stablecoins_bucket.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    document.getElementById('totalValue').innerText = '$' + data.total_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    document.getElementById('timestamp').innerText = 'Last updated: ' + new Date(data.timestamp).toLocaleString('no-NO');
                    
                    document.getElementById('results').classList.remove('hidden');
                } else {
                    document.getElementById('errorBox').innerText = 'Error: ' + data.message;
                    document.getElementById('errorBox').classList.remove('hidden');
                    document.getElementById('results').classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('errorBox').innerText = 'Error: ' + error.message;
                document.getElementById('errorBox').classList.remove('hidden');
            }

            btn.disabled = false;
            btn.innerHTML = '🚀 Run Portfolio Report Now';
        }
    </script>
</body>
</html>
"""


def fetch_debank_data(api_key, wallet_address):
    """Fetch portfolio data from DeBank API."""
    
    print(f"Fetching data for wallet: {wallet_address}")
    
    # Fetch total balance
    url = f"{DEBANK_API_BASE}/user/total_balance"
    headers = {"accept": "application/json", "AccessKey": api_key}
    params = {"id": wallet_address}
    
    print(f"Calling DeBank API: {url}")
    response = requests.get(url, headers=headers, params=params, timeout=30)
    
    print(f"Response status: {response.status_code}")
    print(f"Response text: {response.text[:500]}")
    
    if response.status_code != 200:
        raise Exception(f"DeBank API error {response.status_code}: {response.text[:200]}")
    
    try:
        data = response.json()
    except json.JSONDecodeError as e:
        raise Exception(f"DeBank returned invalid JSON: {str(e)}. Response: {response.text[:200]}")
    
    total_usd = float(data.get("total_usd_value", 0))
    print(f"Total USD value: {total_usd}")
    
    # Fetch token list
    url = f"{DEBANK_API_BASE}/user/all_token_list"
    params = {"id": wallet_address, "is_all": "true"}
    
    print(f"Fetching token list...")
    response = requests.get(url, headers=headers, params=params, timeout=30)
    
    if response.status_code != 200:
        raise Exception(f"DeBank API error {response.status_code}: {response.text[:200]}")
    
    try:
        tokens = response.json() if isinstance(response.json(), list) else []
    except json.JSONDecodeError as e:
        raise Exception(f"DeBank returned invalid JSON for tokens: {str(e)}")
    
    print(f"Found {len(tokens)} tokens")
    
    # Calculate THREE separate buckets
    eth_total = 0.0
    btc_total = 0.0
    stablecoin_total = 0.0
    
    for token in tokens:
        symbol = token.get("symbol", "").upper()
        price = float(token.get("price", 0))
        amount = float(token.get("amount", 0))
        usd_value = price * amount
        
        if symbol in ETH_TOKENS:
            eth_total += usd_value
            print(f"  {symbol}: ${usd_value:,.2f} -> ETH Bucket")
        elif symbol in BTC_TOKENS:
            btc_total += usd_value
            print(f"  {symbol}: ${usd_value:,.2f} -> BTC Bucket")
        elif symbol in STABLECOIN_TOKENS:
            stablecoin_total += usd_value
            print(f"  {symbol}: ${usd_value:,.2f} -> Stablecoins Bucket")
    
    return {
        "eth_bucket": eth_total,
        "btc_bucket": btc_total,
        "stablecoins_bucket": stablecoin_total,
        "total_value": total_usd
    }


def send_email_smtp(subject, body):
    """Send email via SMTP using hardcoded config."""
    print(f"Sending email to {RECIPIENT_EMAIL}...")
    
    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = RECIPIENT_EMAIL
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
    
    print("Email sent successfully!")


@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/run-report-auto', methods=['POST', 'GET'])
def run_report_auto():
    """API endpoint to run the portfolio report with hardcoded config."""
    try:
        print("=== Starting Portfolio Report ===")
        
        # Fetch data from DeBank using hardcoded API key
        result = fetch_debank_data(DEBANK_API_KEY, WALLET_ADDRESS)
        
        # Build email body
        oslo_tz = pytz.timezone("Europe/Oslo")
        today = datetime.now(oslo_tz).strftime("%Y-%m-%d")
        
        email_body = f"""Daily Portfolio Report
Date: {today}

=== Portfolio Summary ===
ETH Bucket:            ${result['eth_bucket']:,.2f}
BTC Bucket:            ${result['btc_bucket']:,.2f}
Stablecoins Bucket:    ${result['stablecoins_bucket']:,.2f}
Total Portfolio Value: ${result['total_value']:,.2f}

---
Wallet: {WALLET_ADDRESS}
Generated at: {datetime.now(oslo_tz).strftime("%Y-%m-%d %H:%M:%S %Z")}
"""
        
        # Send email
        subject = f"Daily Portfolio Report - {today}"
        send_email_smtp(subject, email_body)
        message = "Report generated and email sent successfully!"
        
        print("=== Report completed successfully ===")
        
        return jsonify({
            "success": True,
            "message": message,
            "eth_bucket": result['eth_bucket'],
            "btc_bucket": result['btc_bucket'],
            "stablecoins_bucket": result['stablecoins_bucket'],
            "total_value": result['total_value'],
            "timestamp": datetime.now(oslo_tz).isoformat()
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
