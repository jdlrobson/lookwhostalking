const args = process.argv;
const _cachedOnly = !!args[2];
const projects = require('./projects.json');
const topics = {
    sections: []
};
const WAIT_INC = _cachedOnly ? 0 : 1000;
const fs = require( 'fs' );
const TOPIC_PATH = `${__dirname}/topics.json`;
const TOPIC_CACHE_PATH = `${__dirname}/.topicCache.json`;
const topicCache = fs.existsSync( TOPIC_CACHE_PATH ) ?
    JSON.parse(fs.readFileSync( TOPIC_CACHE_PATH ).toString()) : {};

const util = require( './util.js' );
const cachedFetch = util.cachedFetch;
const saveCache = util.saveCache;
const tooManyRequests = util.tooManyRequests;

/*
projects.json: https://www.wikidata.org/wiki/Q4582194
var getsite = (x) => {  const url = x.replace( 'wik', '.wik' ).replace( 'wiktionary', 'wiktionary.org' ).replace('commons.wiki', 'commons.wikipedia.org').replace('meta.wiki', 'meta.wikimedia.org').replace('.wikidatawiki', 'www.wikidata.org').replace('media.wiki.wiki', 'www.mediawiki.org').replace('.wikivoyage', 'wikivoyage.org').replace('.wikiversity', '.wikiversity.org').replace('wikinews', 'wikinews.org').replace('wikiquote','wikiquote.org').replace('wikibooks', 'wikibooks.org'); return url.indexOf('.org') === -1 ? url + 'pedia.org' : url }

Array.from($('.wikibase-sitelinkview').map((i,t) => {
    var $a = $(t).find('.wikibase-sitelinkview-page a');
    var site = getsite($(t).data('wb-siteid'));
    return { site, href: $a.attr('href'), title: $a.attr('title') }
}))
*/
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
            if ( tooManyRequests() ) {
                waitTime = 0;
            }
            return waitFor(waitTime).then(() => {
                const site = p.site;
                const title = p.title;
                console.log(`Loading topics from ${site} [[${title}]] (${i}/${projects.length})`);
                const url = `https://${site}/w/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=sections`
                const handle = (r) => {
                    if ( !r || !r.parse || !r.parse.sections ) {
                        console.log('Bad response', r);
                        return;
                    }
                    const pSections = r.parse.sections.filter( ( { toclevel } ) => toclevel === 1);
                    const newSections = pSections.map(( { anchor, line, byteoffset }, i ) => {
                        const nextBytes = i + 1 >= pSections.length ? undefined : pSections[ i + 1 ].byteoffset;
                        const bytes = nextBytes ? nextBytes - byteoffset : undefined;
                        if ( bytes === 0 ) {
                            console.log(nextBytes, bytes)
                            throw new Error('');
                        }
                        return ( {
                            bytes,
                            site,
                            language: p.lang || p.site.split( '.' )[0],
                            url: `https://${site}/wiki/${encodeURIComponent(title)}#${anchor}`,
                            line,
                        } )
                    } );
                    topics.sections = topics.sections.concat(
                        newSections
                     );
                     return r;
                };
                return new Promise(( resolve ) => {
                    return cachedFetch(url).then( ( r ) => {
                        handle(r);
                        resolve();
                    }, function () {
                        resolve();
                    } );
                })
            });
         })
    );
};

const update = () => {
    console.log('Updating topics')
    topics.modified = new Date();
    const now = new Date();
    topics.sections.forEach((topic) => {
        let ts = topicCache[topic.url];
        if ( !ts ) {
            topicCache[topic.url] = now;
        }
        if ( !topic.indexedAt ) {
            topic.indexedAt = ts ? new Date( ts ) : now;
        } else {
            // convert string to date
            topic.indexedAt = new Date( topic.indexedAt );
        }
    });
    // limit to 500 most recent topics
    topics.sections = topics.sections.sort((a, b) => a.indexedAt < b.indexedAt ? 1 : -1).slice(0, 1000);
    saveCache( TOPIC_PATH, topics );
    saveCache( TOPIC_CACHE_PATH, topicCache );
    util.stats();
};

pollAllProjects().then(update, update)
