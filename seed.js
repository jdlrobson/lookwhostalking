const _cachedOnly = false;
const projects = require('./projects.json');
const WAIT_INC = _cachedOnly ? 0 : 500;
const util = require( './util.js' );
const cachedFetch = util.cachedFetch;
const saveCache = util.saveCache;

const fs = require( 'fs' );
const TOPIC_CACHE_PATH = `${__dirname}/.topicCache.json`;
const topicCache = fs.existsSync( TOPIC_CACHE_PATH ) ?
    JSON.parse(fs.readFileSync( TOPIC_CACHE_PATH ).toString()) : {};

const waitFor = ( time ) => {
    return new Promise (( resolve ) => {
        setTimeout( () => resolve(), time )
    });
};

let waitTime = 0;

const pollAllProjects = () => {
    return Promise.allSettled(
        projects.map((p, i) => {
            waitTime += WAIT_INC;
            return waitFor(waitTime).then(() => {
                const site = p.site;
                const title = p.title;
                console.log(`Loading last modified from ${site} [[${title}]] (${i}/${projects.length})`);
                const url = `https://${site}/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=timestamp&formatversion=2`;
                console.log(url);
                return cachedFetch(url, _cachedOnly).then((r) => {
                    try {
                        topicCache[site] = r.query.pages[0].revisions[0].timestamp;
                        console.log('update', site, 'to',topicCache[site] )
                    } catch ( e ) {
                        // not sure what happened here.
                        console.log(`error: ${e}`)
                    }
                });
            });
         })
    );
};

const update = () => {
    let modifications = 0;
    Object.keys(topicCache).forEach((topic) => {
        const siteMatch = topic.match(/https:\/\/(.*)\/wiki\/[^\/]*/);
        if (!siteMatch) {
            return;
        }
        const site = siteMatch[1];
        const ts = topicCache[topic];
        const siteTs = topicCache[site];
        if ( siteTs && ts ) {
            // if the currently logged timestamp is older than the last update to the wiki page,
            // its incorrect and must be adjusted.
            if ( ts > siteTs ) {
                console.log('update', ts, 'to', siteTs);
                topicCache[topic] = siteTs;
                modifications++;
            }
        }
    });
    console.log(`corrected ${modifications} entries`);
    saveCache( TOPIC_CACHE_PATH, topicCache );
};

pollAllProjects().then(update, update)
