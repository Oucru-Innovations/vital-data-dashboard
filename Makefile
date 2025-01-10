base: 
	docker rm base-ui || true 
	docker build -f Dockerfile-base -t base-ui .


down:
	docker stop vital-data-dashboard || true &&  docker rm vital-data-dashboard || true
up:
	docker run -d --name vital-data-dashboard \
	-p 3000:80 \
	--expose 80 \
	--publish 80 \
	--add-host=host.docker.internal:host-gateway \
	--add-host=localhost:172.17.0.1 \
	-it vital-data-dashboard
	docker logs --follow vital-data-dashboard > ./UI.log &
#  -it vital-data-dashboard

# --net=host \
# --add-host localhost=[172.17.0.1] 
rebuild:
	make down 
	docker build -f Dockerfile -t vital-data-dashboard .
	make up
