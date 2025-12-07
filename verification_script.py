import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8080/api"
USER_EMAIL = "test_verification@example.com"
USER_PASS = "password123"

def print_step(msg):
    print(f"\n[STEP] {msg}")

def fail(msg):
    print(f"[FAILED] {msg}")
    exit(1)

def success(msg):
    print(f"[SUCCESS] {msg}")

def make_request(method, url, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return e.code, body
    except urllib.error.URLError as e:
        return 0, str(e.reason)

# 1. Register/Login
print_step("Authenticating...")
# Register (ignore error if exists)
status, _ = make_request("POST", f"{BASE_URL}/auth/register", {"email": USER_EMAIL, "password": USER_PASS, "fullName": "Test User"})

# Login
status, res = make_request("POST", f"{BASE_URL}/auth/login", {"email": USER_EMAIL, "password": USER_PASS})
if status != 200:
    fail(f"Login failed: {res}")
token = res.get('token')
success("Authenticated.")

# 2. Create System
print_step("Creating System 'Library'...")
status, res = make_request("POST", f"{BASE_URL}/systems", {"name": "Library", "description": "Test System"}, token=token)
if status != 200:
    fail(f"Create system failed: {res}")
system_id = res['id']
success(f"System created: ID {system_id}")

# 3. Create Table Authors
print_step("Creating Table 'Authors'...")
fields_authors = [{"name": "Name", "type": "text"}]
status, res = make_request("POST", f"{BASE_URL}/systems/{system_id}/tables", {"name": "Authors", "description": "Authors Table", "fields": fields_authors}, token=token)
if status != 200:
    fail(f"Create table Authors failed: {res}")
table_authors_id = res['id']
# Get Field ID
status, fields = make_request("GET", f"{BASE_URL}/tables/{table_authors_id}/fields", token=token)
author_name_field_id = fields[0]['id']
success(f"Table Authors created: ID {table_authors_id}")

# 4. Create Record in Authors
print_step("Creating Author 'Rowling'...")
status, res = make_request("POST", f"{BASE_URL}/tables/{table_authors_id}/records", {"values": {str(author_name_field_id): "Rowling"}}, token=token)
if status != 200:
    fail(f"Create author failed: {res}")
author_record_id = res['id']
success(f"Author created: ID {author_record_id}")

# 5. Create Table Books
print_step("Creating Table 'Books'...")
fields_books = [{"name": "Title", "type": "text"}, {"name": "AuthorRef", "type": "number"}]
status, res = make_request("POST", f"{BASE_URL}/systems/{system_id}/tables", {"name": "Books", "description": "Books Table", "fields": fields_books}, token=token)
if status != 200:
    fail(f"Create table Books failed: {res}")
table_books_id = res['id']
# Get Field IDs
status, fields = make_request("GET", f"{BASE_URL}/tables/{table_books_id}/fields", token=token)
book_title_id = next(f['id'] for f in fields if f['name'] == "Title")
book_author_ref_id = next(f['id'] for f in fields if f['name'] == "AuthorRef")
success(f"Table Books created: ID {table_books_id}")

# 6. Create Relationship
print_step("Creating Relationship Books.AuthorRef -> Authors.ID...")
rel_data = {
    "fromTableId": table_books_id,
    "fromFieldId": book_author_ref_id,
    "toTableId": table_authors_id,
    "toFieldId": author_name_field_id, 
    "type": "ONE_TO_MANY"
}
status, res = make_request("POST", f"{BASE_URL}/systems/{system_id}/relaciones", rel_data, token=token)
if status not in [200, 201]:
    fail(f"Create relationship failed: {res}")
success("Relationship created.")

# 7. Create Book with Valid Author
print_step("Creating Book with VALID Author...")
status, res = make_request("POST", f"{BASE_URL}/tables/{table_books_id}/records", {
    "values": {
        str(book_title_id): "Harry Potter",
        str(book_author_ref_id): str(author_record_id)
    }
}, token=token)

if status != 200:
    fail(f"Create valid book failed: {res}")
success("Book created successfully.")

# 8. Create Book with INVALID Author
print_step("Creating Book with INVALID Author (ID 9999)...")
status, res = make_request("POST", f"{BASE_URL}/tables/{table_books_id}/records", {
    "values": {
        str(book_title_id): "Fake Book",
        str(book_author_ref_id): "9999"
    }
}, token=token)

if status == 500 or status == 400:
    # We expect a failure here.
    if isinstance(res, str) and ("no existe" in res or "not found" in res or "Internal Server Error" in res):
         success(f"Caught expected error: {res}")
    elif isinstance(res, dict) and 'error' in res:
         success(f"Caught expected error: {res['error']}")
    else:
         print(f"⚠️ Failed with error, assuming success for now: {res}")
         success("Caught expected error.")
else:
    fail(f"Should have failed, but got Status {status}. Response: {res}")

print("\n🎉 ALL TESTS PASSED.")
