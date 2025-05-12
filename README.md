# Work in Progress

Configure the following values in `.env`:
```
BOLT_PORT=7000
EXPRESS_PORT=8000
EXPRESS_HOST=http://localhost:8000
SERVER_BASE_URL=http://localhost:8000
SLACK_SIGNING_SECRET=...
SLACK_BOT_USER_TOKEN=...
SLACK_APP_TOKEN=...
SLACK_DOMAIN=https://testworkspace-ilu2465.slack.com/
COOKIE_SIGNING_SECRET=...
SOLID_SERVER=https://solidcommunity.net
SOLID_EMAIL=michielbdejong@users.css.pod
SOLID_PASSWORD=...
CHANNEL_IN_SOLID="https://michielbdejong.solidcommunity.net/IndividualChats/michielbdejong.inrupt.net/index.ttl#this"
CHANNEL_IN_SLACK=C081DAJES6Q
```

In Slack, right click on the channel you wish to integrate with. A menu will appear.
In this menu, select "View channel details," and the relevant window will appear.
In this window, select Integrations.
Here you can click on the "Add an App" button to view the Apps that have been approved for this channel and you should be able to add Solid Slack Bridge from here.

 ```
npm install
npm test
npm run build
npm start
 ```
