# Record Hayer to video POC

## Description
This POC opens a Hayer banner, plays it and records it to video
### Scope
The only scope (for now) is to prove that it is possible to record a Hayer banner to video

There is no waiting for banner to start, etc.
## Installation
1. Clone the repository
2. Run `nvm use`
3. Run `npm install`

## Usage
Run `node index.js`
After a while you should see a video file in the root of the project

### Tweaks to try
- Put in another banner :)
- Set `headless` to `false` in [index.js](index.js) to see the browser in action
- Change video format (see [mime-types.json](mime-types.json) for supported formats)
