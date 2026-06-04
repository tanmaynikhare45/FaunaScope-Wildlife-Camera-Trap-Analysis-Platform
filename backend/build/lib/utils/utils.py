"""
This module contains utility functions for user authentication and authorization using Clerk SDK.
This is a helper module with functions used to authenticate frontend requests to the backend.

"""

from clerk_backend_api import Clerk,AuthenticateRequestOptions

from fastapi import HTTPException
import os
from dotenv import load_dotenv
from collections import namedtuple
import uuid


UserObj = namedtuple("UserObj", ["id"])

load_dotenv() # Load environment variables from .env file(it looks for .env file in the root directory by default)
clerk_sdk=Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY")) #This is my secret key


def authenticate_and_get_user(request):
    # TEMPORARY BYPASS FOR TESTING - REMOVE IN PRODUCTION
    print("DEBUG: Authentication bypassed for testing")
    return UserObj(id="test_user_123")
    
    # Original authentication code (commented out for testing)
    """
    try:
        request_state = clerk_sdk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:5173","http://localhost:5174"],
                jwt_key=os.getenv("JWT_SECRET_KEY")
            )
        )

        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid Token")

        # Clerk returns an identifier in the "sub" claim. We must not coerce it to a
        # python uuid.UUID because Clerk ids are not guaranteed to be valid UUIDs.
        # Keep the id as the original string so it matches the database (models.User.id is String).
        user_id_str = request_state.payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return UserObj(id=user_id_str)

    except HTTPException:
        # Re-raise HTTPExceptions (like 401) as-is
        raise
    except Exception as e:
        # Treat unexpected errors during auth as unauthorized rather than server error to avoid leaking
        # internal exception messages to clients.
        raise HTTPException(status_code=401, detail=f"Unauthorized/Invalid Credentials: {str(e)}")
    """
