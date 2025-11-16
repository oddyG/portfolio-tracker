#!/usr/bin/env python3
"""
Flask Web Server for DeBank Portfolio Tracker
Can be hosted on Render, Railway, Fly.io, or similar platforms
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

# DeBank API base URL
DEBANK_API_BASE = "https://pro-openapi.debank.com/v1"

# Token categorization
ETH_BTC_TOKENS = {"ETH", "WETH", "WBTC", "TBTC", "RENBTC", "HBTC", "BTC"}
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
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">DeBank Portfolio Tracker</h1>
            <p class="text-gray-600">Monitor your crypto portfolio in real-time</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8 mb-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Configuration</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">DeBank API Key</label>
                    <input type="password" id="debankApiKey" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" placeholder="From cloud.debank.com">
                </div>
                
                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">Wallet Address</label>
                    <input type="text" id="walletAddress" value="0x0a9ee3ff883dde459aa06f9ce817ba072aea722c" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">SMTP Host</label>
                    <input type="text" id="smtpHost" value="smtp.gmail.com" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">SMTP Port</label>
                    <input type="text" id="smtpPort" value="587" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">SMTP Username</label>
                    <input type="text" id="smtpUser" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" placeholder="your-email@gmail.com">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">SMTP Password</label>
                    <input type="password" id="smtpPassword" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500" placeholder="App password">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">Sender Email</label>
                    <input type="email" id="senderEmail" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                </div>

                <div>
                    <label class="block text-gray-700 mb-2 text-sm font-medium">Recipient Email</label>
                    <input type="email" id="recipientEmail" class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500">
                </div>
            </div>

            <button onclick="runReport()" id="runBtn" class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all">
                Run Portfolio Report
            </button>
        </div>

        <div id="results" class="hidden">
            <div id="errorBox" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"></div>
            
            <div id="successBox" class="hidden bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6"></div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">ETH/BTC Bucket</h3>
                    <p class="text-3xl font-bold" id="ethBtcValue">$0.00</p>
                </div>

                <div class="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">Stablecoins</h3>
                    <p class="text-3xl font-bold" id="stablecoinsValue">$0.00</p>
                </div>

                <div class="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
                    <h3 class="text-lg font-semibold mb-2">Total Portfolio</h3>
                    <p class="text-3xl font-bold" id="totalValue">$0.00</p>
                </div>
            </div>

            <div class="bg-white rounded-lg p-4 mt-6 shadow">
                <p class="text-gray-600 text-sm" id="timestamp"></p>
            </div>
        </div>

        <div class="bg-blue-100 border border-blue-400 rounded-lg p-6 mt-6">
            <h3 class="text-blue-800 font-semibold mb-3">📋 Setup Instructions</h3>
            <ul class="text-blue-700 text-sm space-y-2 list-disc list-inside">
                <li>Get DeBank API key from <a href="https://cloud.debank.com" target="_blank" class="underline">cloud.debank.com</a></li>
                <li>For Gmail: Enable 2FA and create App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" class="underline">myaccount.google.com/apppasswords</a></li>
                <li>Click "Run Portfolio Report" to fetch data and send email</li>
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

            const config = {
                debank_api_key: document.getElementById('debankApiKey').value,
                wallet_address: document.getElementById('walletAddress').value,
                smtp_host: document.getElementById('smtpHost').value,
                smtp_port: document.getElementById('smtpPort').value,
                smtp_user: document.getElementById('smtpUser').value,
                smtp_password: document.getElementById('smtpPassword').value,
                sender_email: document.getElementById('senderEmail').value,
                recipient_email: document.getElementById('recipientEmail').value
            };

            try {
                const response = await fetch('/api/run-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('successBox').innerText = data.message;
                    document.getElementById('successBox').classList.remove('hidden');
                    
                    document.getElementById('ethBtcValue').innerText = '$' + data.eth_btc_bucket.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
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
            btn.innerHTML = 'Run Portfolio Report';
        }
    </script>
</body>
</html>
"""


def fetch_debank_data(api_key, wallet_address):
    """Fetch portfolio data from DeBank API."""
    
    # Fetch total balance
    url = f"{DEBANK_API_BASE}/user/total_balance"
    headers = {"accept": "application/json", "AccessKey": api_key}
    params = {"id": wallet_address}
    
    response = requests.get(url, headers=headers, params=params, timeout=30)
    if response.status_code != 200:
        raise Exception(f"DeBank API error {response.status_code}: {response.text}")
    
    data = response.json()
    total_usd = float(data.get("total_usd_value", 0))
    
    # Fetch token list
    url = f"{DEBANK_API_BASE}/user/all_token_list"
    params = {"id": wallet_address, "is_all": "true"}
    
    response = requests.get(url, headers=headers, params=params, timeout=30)
    if response.status_code != 200:
        raise Exception(f"DeBank API error {response.status_code}: {response.text}")
    
    tokens = response.json() if isinstance(response.json(), list) else []
    
    # Calculate buckets
    eth_btc_total = 0.0
    stablecoin_total = 0.0
    
    for token in tokens:
        symbol = token.get("symbol", "").upper()
        price = float(token.get("price", 0))
        amount = float(token.get("amount", 0))
        usd_value = price * amount
        
        if symbol in ETH_BTC_TOKENS:
            eth_btc_total += usd_value
        elif symbol in STABLECOIN_TOKENS:
            stablecoin_total += usd_value
    
    return {
        "eth_btc_bucket": eth_btc_total,
        "stablecoins_bucket": stablecoin_total,
        "total_value": total_usd
    }


def send_email_smtp(config, subject, body):
    """Send email via SMTP."""
    msg = MIMEMultipart()
    msg["From"] = config["sender_email"]
    msg["To"] = config["recipient_email"]
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    
    with smtplib.SMTP(config["smtp_host"], int(config["smtp_port"])) as server:
        server.starttls()
        server.login(config["smtp_user"], config["smtp_password"])
        server.send_message(msg)


@app.route('/')
def index():
    """Serve the main HTML page."""
    return render_template_string(HTML_TEMPLATE)


@app.route('/api/run-report', methods=['POST'])
def run_report():
    """API endpoint to run the portfolio report."""
    try:
        config = request.json
        
        # Validate required fields
        if not config.get('debank_api_key'):
            return jsonify({
                "success": False,
                "message": "DeBank API key is required"
            }), 400
        
        # Fetch data from DeBank
        result = fetch_debank_data(
            config['debank_api_key'],
            config.get('wallet_address', '0x0a9ee3ff883dde459aa06f9ce817ba072aea722c')
        )
        
        # Build email body
        oslo_tz = pytz.timezone("Europe/Oslo")
        today = datetime.now(oslo_tz).strftime("%Y-%m-%d")
        
        email_body = f"""Daily Portfolio Report
Date: {today}

=== Portfolio Summary ===
ETH/BTC Bucket:        ${result['eth_btc_bucket']:,.2f}
Stablecoins Bucket:    ${result['stablecoins_bucket']:,.2f}
Total Portfolio Value: ${result['total_value']:,.2f}

---
Wallet: {config.get('wallet_address')}
Generated at: {datetime.now(oslo_tz).strftime("%Y-%m-%d %H:%M:%S %Z")}
"""
        
        # Send email if credentials provided
        if all([config.get('smtp_user'), config.get('smtp_password'), 
                config.get('sender_email'), config.get('recipient_email')]):
            subject = f"Daily Portfolio Report - {today}"
            send_email_smtp(config, subject, email_body)
            message = "Report generated and email sent successfully!"
        else:
            message = "Report generated successfully (email credentials not provided)"
        
        return jsonify({
            "success": True,
            "message": message,
            "eth_btc_bucket": result['eth_btc_bucket'],
            "stablecoins_bucket": result['stablecoins_bucket'],
            "total_value": result['total_value'],
            "timestamp": datetime.now(oslo_tz).isoformat()
        })
        
    except Exception as e:
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