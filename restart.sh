git pull -f
docker compose down
docker compose -f docker-compose.prod.yml up --build -d
