from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class VoiceRecording(db.Model):
    __tablename__ = 'voice_recordings'
    
    id = db.Column(db.Integer, primary_key=True)
    audio_data = db.Column(db.LargeBinary, nullable=False)  # Store audio data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    page_type = db.Column(db.String(20), nullable=False)  # 'deposit', 'withdraw', or 'account-opening'
    session_id = db.Column(db.String(50), nullable=False)  # To group recordings from same form session

class GeneratedPDF(db.Model):
    __tablename__ = 'generated_pdfs'
    
    id = db.Column(db.Integer, primary_key=True)
    pdf_data = db.Column(db.LargeBinary, nullable=False)  # Store PDF data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    page_type = db.Column(db.String(20), nullable=False)  # 'deposit', 'withdraw', or 'account-opening'
    session_id = db.Column(db.String(50), nullable=False)  # To link with voice recordings

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(12), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(10), nullable=False)
    address = db.Column(db.Text, nullable=False)
    account_type = db.Column(db.String(20), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active, inactive, blocked

    def to_dict(self):
        return {
            'id': self.id,
            'account_number': self.account_number,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'account_type': self.account_type,
            'balance': self.balance,
            'created_at': self.created_at.isoformat(),
            'status': self.status
        }

class VoiceTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(12), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'deposit' or 'withdraw'
    original_speech = db.Column(db.Text)
    translated_speech = db.Column(db.Text)
    language = db.Column(db.String(10))
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # New fields for deposit
    branch_name = db.Column(db.String(100))
    date = db.Column(db.Date)
    account_holder_name = db.Column(db.String(100))
    deposit_mode = db.Column(db.String(20))  # cash, cheque, transfer
    cheque_number = db.Column(db.String(20))
    cheque_bank_name = db.Column(db.String(100))
    denomination_details = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'account_number': self.account_number,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'original_speech': self.original_speech,
            'translated_speech': self.translated_speech,
            'language': self.language,
            'status': self.status,
            'timestamp': self.timestamp.isoformat(),
            'branch_name': self.branch_name,
            'date': self.date.isoformat() if self.date else None,
            'account_holder_name': self.account_holder_name,
            'deposit_mode': self.deposit_mode,
            'cheque_number': self.cheque_number,
            'cheque_bank_name': self.cheque_bank_name,
            'denomination_details': self.denomination_details
        } 