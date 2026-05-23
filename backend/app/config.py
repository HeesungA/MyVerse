from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    frontend_url: str = "http://localhost:3000"
    solapi_api_key: str = ""
    solapi_api_secret: str = ""
    solapi_sender: str = ""
    anthropic_api_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
