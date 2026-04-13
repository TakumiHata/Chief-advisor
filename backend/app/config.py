from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Chief Advisor - Image Analysis Backend"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]
    chroma_host: str = "localhost"
    chroma_port: int = 8100
    youtube_api_key: str = ""

    model_config = {"env_prefix": "CA_"}


settings = Settings()
