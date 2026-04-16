FROM nginx:alpine

# Copy the pre-built output to the nginx static html directory
COPY dist /usr/share/nginx/html

# Replace the default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run defaults to port 8080 or uses PORT env var
EXPOSE 8080

# Start Nginx server
CMD ["sh", "-c", "envsubst '\\$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.tmp && mv /etc/nginx/conf.d/default.tmp /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
