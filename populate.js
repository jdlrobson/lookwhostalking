const _cachedOnly = false;
const projects = require('./projects.json');
const topics = {
    sections: []
};
const WAIT_INC = _cachedOnly ? 0 : 2000;
const fetch = require( 'node-fetch');
const fs = require( 'fs' );
const TOPIC_PATH = `${__dirname}/topics.json`;
const FETCH_CACHE_PATH = `${__dirname}/.fetchCache.json`;
const fetchCache = fs.existsSync( FETCH_CACHE_PATH ) ?
    JSON.parse(fs.readFileSync( FETCH_CACHE_PATH ).toString()) : {};

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

const addMinsToDate = ( mins, toDate ) => {
   const date = toDate ? new Date( toDate ) : new Date();
    date.setTime( date.getTime() + ( mins * 60 * 1000 ) );
    return date;
};

const saveCache = ( path, json ) => {
    fs.writeFileSync(
        path,
        JSON.stringify( json )
    );
};

const getExpiryDate = ( url ) => {
    if ( url.indexOf( '.wikipedia.org' ) > -1 ) {
        return 60;
    } else {
        return ( 12 * 60 );
    }
};

const now = new Date();

const cachedFetch = ( url ) => {
    const cachedResult = fetchCache[url];
    if ( cachedResult || _cachedOnly ) {
        if ( now < cachedResult.expires ) {
            console.log('(Loaded from cache)')
            return Promise.resolve( cachedResult.json );
        }
    }
    console.log('(Fetching from server)')
    return fetch( url ).then((r)=>r.json()).then((json) => {
        // should expire anywhere between 1-2hrs
        const mins = getExpiryDate( url ) + ( Math.random() * 60 );
        fetchCache[url] = { json, expires: addMinsToDate( mins ) };
        saveCache( FETCH_CACHE_PATH, fetchCache );
        return json;
    });
}

let waitTime = 0;

const pollAllProjects = () => {
    return Promise.all(
        projects.map((p) => {
            waitTime += WAIT_INC;
            return waitFor(waitTime).then(() => {
                const site = p.site;
                const title = p.title;
                console.log(`Loading topics from ${site} [[${title}]]`);
                const url = `https://${site}/w/api.php?action=parse&format=json&page=${encodeURIComponent(title)}&prop=sections`
                return cachedFetch(url).then((r) => {
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
                });
            });
         })
    );
};

const update = () => {
    topics.modified = new Date();
    saveCache( TOPIC_PATH, topics );
};

pollAllProjects().then(update, update)
