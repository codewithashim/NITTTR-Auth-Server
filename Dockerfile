# Stage 1: Build stage
FROM node:21-alpine AS build
 
WORKDIR /usr/src/app
 
COPY package*.json ./
 
RUN npm ci --only=production
 
FROM node:21-alpine AS production
 
WORKDIR /usr/src/app
 
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY . .
 
EXPOSE 8000
 
CMD ["npm", "start"]
