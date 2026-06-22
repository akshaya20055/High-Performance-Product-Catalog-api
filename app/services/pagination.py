import base64
import json
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import UUID

def encode_cursor(updated_at: datetime, item_id: UUID) -> str:
    """
    Encodes the pagination cursor as a URL-safe base64 string.
    The cursor encodes both the updated_at timestamp and the UUID id
    to ensure uniqueness and stable sorting.
    """
    # Ensure timezone info is preserved as an ISO string
    dt_str = updated_at.isoformat()
    cursor_data = {
        "u": dt_str,
        "i": str(item_id)
    }
    json_bytes = json.dumps(cursor_data).encode("utf-8")
    return base64.urlsafe_b64encode(json_bytes).decode("utf-8")

def decode_cursor(cursor_str: str) -> Tuple[datetime, UUID]:
    """
    Decodes a base64 encoded cursor string back into a (updated_at, id) tuple.
    Raises ValueError if the cursor is invalid.
    """
    try:
        decoded_bytes = base64.urlsafe_b64decode(cursor_str.encode("utf-8"))
        data = json.loads(decoded_bytes.decode("utf-8"))
        
        # Parse datetime
        dt_val = datetime.fromisoformat(data["u"])
        if dt_val.tzinfo is None:
            dt_val = dt_val.replace(tzinfo=timezone.utc)
            
        # Parse UUID
        item_id = UUID(data["i"])
        
        return dt_val, item_id
    except Exception as e:
        raise ValueError("Invalid cursor format or corrupted data.") from e
