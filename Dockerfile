FROM node:16-alpine
RUN apk update && apk add git
ENV NODE_ENV=production
WORKDIR /usr/src/app
# RUN mkdir mail
# COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
# RUN npm install --production --silent && mv node_modules ../
# COPY . .
# copy over ncc built runnable
COPY dist/index.js .
EXPOSE 1025
# pointless?
RUN chown -R node /usr/src/app
USER node
CMD ["node", "index.js"]
