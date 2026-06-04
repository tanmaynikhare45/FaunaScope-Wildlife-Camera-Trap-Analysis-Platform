import boto3 as aws
import os
import urllib.parse
from botocore.client import Config
from botocore.exceptions import ClientError
import dotenv

dotenv.load_dotenv()


REGION_NAME = os.getenv("AWS_REGION", "ap-south-1")

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME") 


AWS_ACCESS_KEY_ID =  os.getenv("AWS_ACCESS_KEY_ID") 
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY") 


def _create_s3_client():
    """Create and return an S3 client if credentials are available, otherwise return None."""
    if not (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and BUCKET_NAME):
        return None
    return aws.client(
        "s3",
        region_name=REGION_NAME,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4")
    )


def generate_presigned_put_url(object_name: str, expiration: int = 3600, content_type: str = None):
    """Generate a presigned URL to upload (PUT) an object to S3.

    Returns the presigned URL string. The caller should PUT the raw file bytes to this URL
    and include the Content-Type header matching the object's content type.
    """
    params = {
        'Bucket': BUCKET_NAME,
        'Key': object_name,
    }
    if content_type:
        params['ContentType'] = content_type

    s3_client = _create_s3_client()
    if s3_client is None:
        raise RuntimeError("S3 credentials or bucket not configured (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET)")
    try:
        url = s3_client.generate_presigned_url('put_object', Params=params, ExpiresIn=expiration)
        return url
    except ClientError:
        raise


def get_object_url(object_name: str) -> str:
    """Return the public URL for an object in the bucket.

    Note: whether this URL is accessible depends on bucket/object ACLs. If objects are private,
    you'll need to generate a presigned GET URL to allow temporary access.
    """
    return f"https://{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com/{object_name}"


def get_s3_key_from_url(url: str) -> str:
    """Extract the S3 object key from a public URL for the configured bucket."""
    parsed = urllib.parse.urlparse(url)
    bucket_host = f"{BUCKET_NAME}.s3.{REGION_NAME}.amazonaws.com"
    if parsed.hostname != bucket_host:
        raise ValueError(f"URL does not belong to configured bucket: {url}")
    return parsed.path.lstrip('/')


def download_file_from_s3(object_name: str) -> bytes:
    """Download a file from S3 and return its bytes."""
    s3_client = _create_s3_client()
    if s3_client is None:
        raise RuntimeError("S3 credentials or bucket not configured")
    
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=object_name)
        return response['Body'].read()
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise FileNotFoundError(f"File {object_name} not found in S3")
        raise


def download_file_from_s3_url(url: str) -> bytes:
    """Download a file from the configured bucket using its public URL."""
    object_name = get_s3_key_from_url(url)
    return download_file_from_s3(object_name)

def upload_fileobj_to_s3(fileobj, object_name: str, content_type: str = None):
    """Upload a file-like object to S3 and return the object URL.

    fileobj should be a file-like object open for reading bytes (e.g., UploadFile.file)
    """
    extra_args = {}
    if content_type:
        extra_args['ContentType'] = content_type

    s3_client = _create_s3_client()
    if s3_client is None:
        raise RuntimeError("S3 credentials or bucket not configured (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET)")
    try:
        
        try:
            fileobj.seek(0)
        except Exception:
            pass

        s3_client.upload_fileobj(Fileobj=fileobj, Bucket=BUCKET_NAME, Key=object_name, ExtraArgs=extra_args or None)
        return get_object_url(object_name)
    except ClientError:
        raise

