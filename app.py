from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from models import db, VoiceRecording, GeneratedPDF
import io
import base64
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///banking.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/deposit.html")
def deposit():
    return render_template("deposit.html")

@app.route("/withdraw.html")
def withdraw():
    return render_template("withdraw.html")

@app.route("/account-opening.html")
def account_opening():
    return render_template("account-opening.html")

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/record-voice', methods=['POST'])
def record_voice():
    try:
        audio_data = request.files['audio'].read()
        page_type = request.form.get('page_type')
        session_id = request.form.get('session_id')
        
        recording = VoiceRecording(
            audio_data=audio_data,
            page_type=page_type,
            session_id=session_id
        )
        db.session.add(recording)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Voice recording saved successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/save-pdf', methods=['POST'])
def save_pdf():
    try:
        pdf_data = request.files['pdf'].read()
        page_type = request.form.get('page_type')
        session_id = request.form.get('session_id')
        
        pdf = GeneratedPDF(
            pdf_data=pdf_data,
            page_type=page_type,
            session_id=session_id
        )
        db.session.add(pdf)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'PDF saved successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/get-recordings/<session_id>', methods=['GET'])
def get_recordings(session_id):
    try:
        recordings = VoiceRecording.query.filter_by(session_id=session_id).all()
        return jsonify({
            'success': True,
            'recordings': [{
                'id': r.id,
                'timestamp': r.timestamp.isoformat(),
                'page_type': r.page_type
            } for r in recordings]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/get-pdf/<session_id>', methods=['GET'])
def get_pdf(session_id):
    try:
        pdf = GeneratedPDF.query.filter_by(session_id=session_id).first()
        if pdf:
            return send_file(
                io.BytesIO(pdf.pdf_data),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'generated_pdf_{pdf.timestamp.strftime("%Y%m%d_%H%M%S")}.pdf'
            )
        return jsonify({
            'success': False,
            'message': 'PDF not found'
        }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/save-withdrawal-pdf', methods=['POST'])
def save_withdrawal_pdf():
    try:
        data = request.get_json()
        pdf_data = data.get('pdfData')
        form_data = data.get('formData')
        
        if not pdf_data or not form_data:
            return jsonify({'success': False, 'message': 'Missing PDF or form data'})
        
        # Decode base64 PDF data
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Save to database using SQLAlchemy
        pdf = GeneratedPDF(
            pdf_data=pdf_bytes,
            page_type='withdrawal',
            session_id=request.form.get('session_id', 'default_session')
        )
        db.session.add(pdf)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error saving withdrawal PDF: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == "__main__":
    app.run(debug=True)

