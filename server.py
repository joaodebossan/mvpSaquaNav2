import http.server
import socketserver
import sqlite3
import json
import urllib.parse
import os
import datetime

PORT = 8080
DB_NAME = 'database.sqlite'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT,
            lat REAL,
            lng REAL,
            endereco TEXT,
            descricao TEXT,
            imagem_base64 TEXT,
            timestamp TEXT,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/relatorios':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            conn = sqlite3.connect(DB_NAME)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM reports')
            rows = c.fetchall()
            reports = [dict(ix) for ix in rows]
            conn.close()
            
            self.wfile.write(json.dumps(reports).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/relatorios':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            tipo = data.get('tipo')
            lat = data.get('lat')
            lng = data.get('lng')
            endereco = data.get('endereco')
            descricao = data.get('descricao')
            imagem_base64 = data.get('imagem_base64', '')
            timestamp = datetime.datetime.utcnow().isoformat() + 'Z'
            status = data.get('status', 'pendente') # admin can send aprovado directly
            
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            c.execute('''
                INSERT INTO reports (tipo, lat, lng, endereco, descricao, imagem_base64, timestamp, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (tipo, lat, lng, endereco, descricao, imagem_base64, timestamp, status))
            conn.commit()
            new_id = c.lastrowid
            conn.close()
            
            self.send_response(201)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'id': new_id}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_PUT(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        if parsed_path.startswith('/api/relatorios/') and '/status' in parsed_path:
            # e.g., /api/relatorios/5/status
            parts = parsed_path.split('/')
            report_id = parts[3]
            
            content_length = int(self.headers['Content-Length'])
            put_data = self.rfile.read(content_length)
            data = json.loads(put_data.decode('utf-8'))
            status = data.get('status')
            
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            c.execute('UPDATE reports SET status = ? WHERE id = ?', (status, report_id))
            conn.commit()
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        if parsed_path.startswith('/api/relatorios/'):
            parts = parsed_path.split('/')
            report_id = parts[3]
            
            conn = sqlite3.connect(DB_NAME)
            c = conn.cursor()
            c.execute('DELETE FROM reports WHERE id = ?', (report_id,))
            conn.commit()
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    init_db()
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print("Servidor rodando em http://localhost:", PORT)
        httpd.serve_forever()
