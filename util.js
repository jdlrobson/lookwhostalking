const fs = require( 'fs' );
const fetch = require( 'node-fetch');
const FETCH_CACHE_PATH = `${__dirname}/.fetchCache.json`;
const fetchCache = fs.existsSync( FETCH_CACHE_PATH ) ?
JSON.parse(fs.readFileSync( FETCH_CACHE_PATH ).toString()) : {};
const MAX_FETCHES = 100;

const saveCache = ( path, json ) => {
    fs.writeFileSync(
        path,
        JSON.stringify( json )
    );
};

const addMinsToDate = ( mins, toDate ) => {
    const date = toDate ? new Date( toDate ) : new Date();
    date.setTime( date.getTime() + ( mins * 60 * 1000 ) );
    return date;
};

const getExpiryDate = ( url ) => {
    if ( url.indexOf( 'wikidata.org' ) > -1 || url.indexOf( 'commons.wikimedia.org' ) > -1 ) {
        return ( 12 * 60 );
    } else if ( url.indexOf( '.wikipedia.org' ) > -1 ) {
        return ( 3 * 60 );
    } else {
        return ( 24 * 60 );
    }
};

let numberOfFetchesInThisSession = 0;
const tooManyRequests = () => numberOfFetchesInThisSession > MAX_FETCHES;
const now = new Date();
const cachedFetch = ( url, cachedOnly ) => {
    const cachedResult = fetchCache[url];
    if ( cachedResult || cachedOnly ) {
        if ( now < cachedResult.expires || tooManyRequests() ) {
            console.log('(Loaded from cache)')
            return Promise.resolve( cachedResult.json );
        }
    }
    if ( tooManyRequests() ) {
        console.log( 'Refusing: too many requests' );
        return Promise.reject();
    }
    console.log('(Fetching from server)')
    numberOfFetchesInThisSession++;
    return fetch( url ).then((r)=>r.json()).then((json) => {
        // should expire anywhere between 1-2hrs
        const mins = getExpiryDate( url ) + ( Math.random() * 60 );
        fetchCache[url] = { json, expires: addMinsToDate( mins ) };
        saveCache( FETCH_CACHE_PATH, fetchCache );
        return json;
    });
}

module.exports = { cachedFetch, tooManyRequests, saveCache };
