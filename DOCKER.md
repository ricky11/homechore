docker build -t homechore .

docker run -d --name homechore -p 8787:8787 -v homechore-data:/app/data homechore

