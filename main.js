const sortByName = (topic, topic2) => {
    return topic.line < topic2.line ? -1 : 1;
};

const sortBySize = (topic, topic2) => {
    return ( topic.bytes || 0 ) > ( topic2.bytes || 0 ) ? -1 : 1;
};


const sortFn = ( type ) => {
    switch ( type ) {
        case '2':
            return sortBySize;
        default:
            return sortByName;
    }
}


const sorter = document.getElementById('sort');
const deduper = document.getElementById( 'duplicates' );
const filterNode = document.getElementById( 'search-filter' );

const render = () => {
    const sortBy = sorter.value;
    const uniqueOnly = deduper.checked;
    const filter = filterNode.value;

    app.innerHTML = '';
    fetch( './topics.json' ).then((r) => r.json()).then((json) => {
        let maxBytes = 0;
        let leastBytes;
        const unfilteredSections = json.sections.sort(sortFn(sortBy));
        const sections = unfilteredSections.filter((s, i) => {
            if ( uniqueOnly ) {
                // filter the list so it only contains this name
                const matches = unfilteredSections.filter((s2) => s2.line === s.line);
                return matches.length === 1;
            } else {
                return true;
            }
        }).filter((s) => {
            if ( filter ) {
                return s.line.indexOf( filter ) > -1;
            } else {
                return true;
            }
        })

        sections.filter((n)=>n.bytes !== undefined).forEach((n) => {
            if ( n.bytes < 300 ) {
                // too small
                return;
            }
            if ( n.bytes > maxBytes ) {
                maxBytes = n.bytes;
            }
            if ( leastBytes == undefined || n.bytes < leastBytes ) {
                leastBytes = n.bytes;
                console.log(leastBytes, n.line, n.site)
            }
        })
        console.log('range', leastBytes, maxBytes, maxBytes - leastBytes);
    
        const getClass = ( b ) => {
            if ( b === undefined ) {
                return 'topic-unknown-size';
            }
            const classes = [ 's', 'm', 'l', 'xl'];
            const increment = ( maxBytes - leastBytes ) / classes.length;
            //console.log(increment, b);
            let size;
            let current = maxBytes - increment;
            while ( classes.length ) {
                size = classes.pop();
                if ( b > current ) {
                    return `topic-${size}`;
                } else {
                    current -= increment;
                }
            }
            return `topic-${size}`;
        };
        const app = document.getElementById( 'app' );
        const ts = document.getElementById( 'app-timestamp' );
        ts.textContent = json.modified;
        const listNode = document.createElement( 'div' );
        
        sections.forEach((topic) => {
            const topicSite = document.createElement( 'span' );
            topicSite.textContent = topic.site;
            const topicNode = document.createElement( 'a' );
            topicNode.lang = topic.lang;
            topicNode.textContent = topic.line
            topicNode.href = topic.url;
            topicNode.setAttribute( 'class', getClass( topic.bytes ) );
            const itemNode = document.createElement( 'li' );
            itemNode.appendChild( topicSite );
            itemNode.setAttribute( 'class', 'topic' );
            itemNode.appendChild( topicNode );
            listNode.appendChild( itemNode );
        })
        app.appendChild( listNode );
    });
}


sorter.addEventListener( 'change', (ev) => {
    render();
})

filterNode.addEventListener( 'input', (ev) => {
    render();
})

deduper.addEventListener( 'change', function () {
    render();
} )
render();