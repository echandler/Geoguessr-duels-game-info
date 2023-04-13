// ==UserScript==
// @name         Geoguessr duels tracker v1.7
// @include      /^(https?)?(\:)?(\/\/)?([^\/]*\.)?geoguessr\.com($|\/.*)/
// @description  Keeps track of duels games
// @downloadURL https://github.com/echandler/Geoguessr-duels-game-info/raw/main/duelsInfo.user.js
// @version      1.7
// ==/UserScript==

let colors = ["#cdc9c9", "green", "red", "blue", "magenta", "black"];

let state = [];

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        if (/duels/.test(url) && !/summary/.test(url) && !/team/.test(url)) {
            setTimeout(getGameInfo, 1000);
         //   getGameInfo();
        }
    }
}).observe(document, { subtree: true, childList: true });

setTimeout(function(){
    // Force a test.. maybe the page was refreshed or the enabled the script in the
    // middle of a game.
    const url = location.href;
    if (/duels/.test(url) && !/summary/.test(url) && !/team/.test(url)) {
        getGameInfo();
    }
}, 2000);

let btnXY = localStorage['duelsBtn']? JSON.parse(localStorage['duelsBtn']): {x: 10, y: 150};
let btn = document.createElement("button");
btn.style.cssText = "background-color: #9cc7ea; border: 1px solid #6d9bce; border-radius: 4px;position: absolute; z-index: 9999999; top: "+btnXY.y +"px; left: "+btnXY.x+"px; cursor: pointer;";
btn.innerText = "Duels Info";
document.body.appendChild(btn);

btn.addEventListener('mousedown', function(e){
    document.body.addEventListener('mousemove', mmove);
    document.body.addEventListener('mouseup', mup);
    let yy = btnXY.y - e.y;
    let xx = e.x - btnXY.x;

    function mmove(evt){
        if (Math.abs(evt.x - e.x) > 2 || Math.abs(evt.y - e.y) > 2){
           document.body.removeEventListener('mousemove', mmove);
           document.body.addEventListener('mousemove', _mmove);
        }
    }

    function _mmove(evt){
        btn.style.top = evt.y + yy + "px";
        btn.style.left = evt.x - xx + "px";
    }

    function mup(evt){
        document.body.removeEventListener('mousemove', mmove);
        document.body.removeEventListener('mousemove', _mmove);
        document.body.removeEventListener('mouseup', mup);

        if (Math.abs(evt.x - e.x) < 2 && Math.abs(evt.y - e.y) < 2){
            state = [];
            showAllGames.call(btn);
            return;
        }

        btnXY.x = evt.x - xx;
        btnXY.y = evt.y + yy;
        localStorage['duelsBtn'] = JSON.stringify(btnXY);
    }
});

//btn.onclick = showAllGames;

function showAllGames() {
    state.push(showAllGames);

    this.disabled = true;
    if (!localStorage.getItem("duelsinfo")) {
        localStorage.setItem("duelsinfo", JSON.stringify({isDuelsInfo: true}));
    }

    let script = document.createElement("script");

    document.body.appendChild(script);

    script.type = "text/javascript";
    script.addEventListener("load", function () {
        btn.disabled = false;
        let data = JSON.parse(localStorage["duelsinfo"]);
        let keys = Object.keys(data);
        let games = [];

        for (let n = 0; n < keys.length; n++) {
            if (!data[keys[n]].duels) continue;
            for (let m = 0; m < data[keys[n]].duels.length; m++) {
                let d = data[keys[n]].duels;
                if (d[m].date === undefined) continue; // Only used for one game. DELETE
                d[m].playerId = keys[n];
                d[m].playerStarred = data[keys[n]].starred;
                games.push(d[m]);
            }
        }

        function compare(a, b) {
            if (+a.date > +b.date) return -1;
            if (+a.date < +b.date) return 1;
            return 0;
        }

        games.sort(compare);


        let body = createMsgBody();
        body.header.innerHTML = "<div>Click on previous games to see results:</div><br>";

        let start = 0;
        let finish = 100;

            function appendLinks(node, start, finish){
                finish = finish >= games.length? games.length : finish;

                for (let n = start; n < finish; n++) {
                    let d = "No date recorded.";

                    if (games[n].date != 0) {
                        d = customDate(+games[n].date);
                    }

                    let numSpan = document.createElement("span");
                    numSpan.innerText = games.length - n + "";
                    numSpan.style.color = "rgb(55 104 241)";
                    numSpan.style.textAlign = "right";
                    body.content.insertBefore(numSpan, node);

                    let gameStar = makeStar("game", games[n].playerId, games[n].game, games[n].starred);
                    body.content.insertBefore(gameStar, node);

                    let gameLink = document.createElement("a");
                    gameLink.innerText = d;
                    gameLink.href = "https://www.geoguessr.com/duels/" + games[n].game + "/summary#_" + (games.length - n) + "_"+ d.replace(/ /g, "_");
                    gameLink.target = "_blank";
                    gameLink.style.color = "rgb(55 104 241)";
                    gameLink.style.textAlign = "justify";
                    body.content.insertBefore(gameLink, node);

                    let playerStar = makeStar("player", games[n].playerId, null, games[n].playerStarred);
                    body.content.insertBefore(playerStar, node);

                    let opponentLink = document.createElement("a");
                    opponentLink.innerText = "Opponent";
                    opponentLink.href = "javascript: void(0)";
                    opponentLink.style.color = "rgb(55 104 241)";
                    opponentLink.style.textAlign = "justify";
                    opponentLink.addEventListener("click", function(e){
                        state.push(showPlayerInfo.bind(null, body, games[n].playerId));
                        state[state.length-1]();
                    });

                    if (data[games[n].playerId].notes){
                        opponentLink.title = data[games[n].playerId].notes;
                        opponentLink.innerText = "Opponenṫ";
                    }
                    body.content.insertBefore(opponentLink, node);

                    let notes = makeNotesBtn(games[n].notes);
                    notes.addEventListener("click", function(e){
                        state.push(makeGameNotesMsg.bind(null, body, games[n].playerId, games[n].game));
                        state[state.length-1]();
                    });
                //    notes.addEventListener("click", getGameNotes.bind(null, games[n].playerId, games[n].game));
                    body.content.insertBefore(notes, node);
                }
            }

            let appendMore = document.createElement("a");
            appendMore.innerText = "Show more...";
            appendMore.href = "javascript: void(0)";
            appendMore.style.color = "rgb(55 104 241)";
            appendMore.style.marginRight = "10px";
            appendMore.style.textAlign = "justify";
            appendMore.style.gridColumn = "3";
            if (games.length < finish){
                appendMore.style.display = 'none';
            }
            appendMore.addEventListener("click", function(){
                start += 101;
                finish = start + 100;
                appendLinks(appendMore, start, finish);
                if (finish >= games.length){
                    appendMore.parentElement.removeChild(appendMore);
                }
            });

            body.content.appendChild(appendMore);

            appendLinks(appendMore, start, finish);

            let downloadData = document.createElement("a");
            downloadData.innerText = "Download Data";
            downloadData.href = "javascript: void(0)";
            downloadData.style.color = "rgb(255 91 91)";
            downloadData.style.marginRight = "10px";
            downloadData.style.textAlign = "justify";
            downloadData.style.gridColumn = "3";
            downloadData.addEventListener("click", function(){
                let data = JSON.parse(localStorage['duelsinfo']);
                let date = 'GeoguessrDuelsInfo1_' + customDate(Date.now());
                downloadObjectAsJSON(data, date);
            });
            body.content.appendChild(downloadData);

            let uploadData = document.createElement("a");
            uploadData.innerText = "Upload Data";
            uploadData.href = "javascript: void(0)";
            uploadData.style.color = "rgb(255 91 91)";
            uploadData.style.textAlign = "justify";
            uploadData.style.gridColumn = "5";
            uploadData.addEventListener("click", function(){
                let input = document.createElement('input');
                input.type = 'file';
                input.addEventListener('change', function(x){
                    const reader = new FileReader();
                    reader.readAsDataURL(this.files[0]);
                    reader.addEventListener('load', (e) => {
                        let data = atob(e.target.result.replace(/data:application\/json;base64,/, ''));
                        data = JSON.parse(data);
                        let dataKeys = Object.keys(data);
                        let local = JSON.parse(localStorage['duelsinfo']);

                        if (!data.isDuelsInfo){
                            alert('File not correct.');
                            return;
                        }

                        for (let n = 0; n < dataKeys.length; n++){
                            if (!data[dataKeys[n]].duels){
                                continue;
                            }

                            if (!local[dataKeys[n]]){
                                local[dataKeys[n]] = data[dataKeys[n]];
                                continue;
                            }

                            let dataDuels = data[dataKeys[n]].duels;
                            let localDuels = local[dataKeys[n]].duels;

                            for (let d1 = 0; d1 < dataDuels.length; d1++){
                                let t = false;

                                for (let d2 = 0; d2 < localDuels.length; d2++){
                                    if (dataDuels[d1].game === localDuels[d2].game){
                                        t = true;
                                        break;
                                    }
                                }

                                if (t == true) {
                                    continue;
                                }

                                for (let m = 0; m < localDuels.length; m++){
                                    // Insert game in order by date.
                                    if (dataDuels[d1].date > localDuels[m].date){
                                        localDuels.splice(m, 0, dataDuels[d1]);
                                        break;
                                    }
                                }
                            }
                        }

                        localStorage['duelsinfo'] = JSON.stringify(local);
                        alert("Looks good!");
                   });
                });

               input.click();
            });
            body.content.appendChild(uploadData);

            let searchBtn= document.createElement("a");
            searchBtn.innerText = "Search";
            searchBtn.href = "javascript: void(0)";
            searchBtn.style.color = "rgb(255 91 91)";
            searchBtn.style.textAlign = "justify";
            searchBtn.style.gridColumn = "3";
            searchBtn.addEventListener("click", function(e){
                state.push(makeSearchWindow.bind(null, body));
                state[state.length-1]();
            });
            body.content.appendChild(searchBtn);

        swal({
            title: "All Games Played",
            content: body.container,
        });

    });

    script.src = "https://unpkg.com/sweetalert/dist/sweetalert.min.js";
};

function makeBackBtn(){
    let goBack = document.createElement("a");
    goBack.innerHTML ="&#x1F519;";
    goBack.href = "javascript: void(0)";
    goBack.style.color = "rgb(55 104 241)";
    goBack.style.fontSize = "2rem";
    goBack.style.display = "inline-block";
    goBack.style.marginBottom = '1rem';
    return goBack;
}

let searchInfo = {};
function makeSearchWindow(body){
    let goBack = makeBackBtn();
    goBack.addEventListener("click", showAllGames);

    body.header.innerHTML = "";
    body.header.appendChild(goBack);

    body.content.innerHTML = `
        <form style='grid-column:1;'>
            <input placeholder="Player #" type="input" id="playerNum" style="display:block;" value="${searchInfo.playerId || ''}" ></input>
            <input placeholder="Game #" type="input" id="gameNum" style="display:block;" value="${searchInfo.gameId || ''}"></input>
            <button type="search" id="_searchBtn" style="display:block;">Search</button>
        </form>
        <div style="grid-column:1;" id="searchResults"></div>
    ` ;

    setTimeout(function(){
        // Have to wait for the innerHTML to be appended to the DOM.
        let searchBtn = document.getElementById('_searchBtn');
        searchBtn.addEventListener('click', function(e){
            e.preventDefault();

            let playerId = document.getElementById('playerNum').value;
            let gameId = document.getElementById('gameNum').value;
            let resultsCont = document.getElementById('searchResults');
            let results = null;

            resultsCont.innerHTML = '';

            if (playerId){
                let data = JSON.parse(localStorage['duelsinfo'] );
                let pData = data[playerId];
                if (pData){
                    let opponentLink = document.createElement("a");
                    opponentLink.innerText = "Player Info.";
                    opponentLink.href = "javascript: void(0)";
                    opponentLink.style.color = "rgb(55 104 241)";
                    opponentLink.style.textAlign = "justify";
                    opponentLink.style.display= "block";
                    opponentLink.addEventListener("click", function(e){
                        state.push(showPlayerInfo.bind(null, body, playerId));
                        state[state.length-1]();
                    });

                    if (pData.notes){
                        opponentLink.title = pData.notes;
                    }
                    resultsCont.appendChild(opponentLink);
                }
            }

            if (gameId){
                results = searchForPlayerByGame(gameId);
                if (results.length !== 0) {
                    console.log(results);
                    for (let n = 0; n < results.length; n++){
                        let d = customDate(+results[n].gameData.date);
                        let gameLink = document.createElement("a");
                        gameLink.innerText = d;
                        gameLink.href = "https://www.geoguessr.com/duels/" + results[n].gameData.game + "/summary#_"+ d.replace(/ /g, "_");
                        gameLink.target = "_blank";
                        gameLink.style.color = "rgb(55 104 241)";
                        gameLink.style.textAlign = "justify";
                        gameLink.style.display= "block";
                        resultsCont.appendChild(gameLink);
                    }
                }
            }

            searchInfo = {
                playerId : playerId,
                gameId : gameId,
            };
        });
//    body.content.appendChild(getPlayerGames(body, playerId));
    }, 500);

    swal({
        title: "Search",
        content: body.container,
    });
}

function showPlayerInfo(body, playerId) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click",function(e){
        state.pop();
        state[state.length-1]();
    });

    body.header.innerHTML = "";
    body.header.appendChild(goBack);
    body.header.appendChild(createPlayerInfoMsg(body, playerId));

    body.content.innerHTML = "";
    body.content.appendChild(getPlayerGames(body, playerId));

    swal({
        title: "Player Info.",
        content: body.container,
    });
}

function makeNotesBtn(noteText){
    let notes = document.createElement("a");
    notes.innerText = "Notes";
    notes.href = "javascript: void(0)";
    notes.style.color = "rgb(55 104 241)";
    notes.style.textAlign = "justify";
    if (noteText){
        notes.title = noteText;
        notes.innerText = "Noteṡ";
    }
    return notes;
}

unsafeWindow.wm = new WeakMap();

function searchElementForNewPlayer(a){
    let p = [a];
    let ret = false;

    for (let n = 0; n <p.length; n++){

        for (let m = 0; m < p[n].childNodes.length; m++){
            let el = p[n].childNodes[m];

            if (el.nodeType !== Node.TEXT_NODE) {
               p.push(el);
               continue;
            }

            if (unsafeWindow.wm.get(el)){
                return false;
            }

            unsafeWindow.wm.set(el, true);

        }
    }


    return true;

}

function getGameInfo() {
    let anchors = document.body.querySelectorAll("a");
    let player = { name: null, idNum: null };

    for (let n = 0; n < anchors.length; n++) {
        if (/user/.test(anchors[n].href)) {
            if (anchors[n].children.length > 0 && /user-nick/i.test(anchors[n].children[0].innerHTML)) {
                if (!searchElementForNewPlayer(anchors[n])){
                    setTimeout(getGameInfo, 1000);
                    return;
                }
                player.name = anchors[n].innerText;
                player.idNum = anchors[n].href.match(/user\/(.*)/)[1];
            }
        }
    }

    if (player.idNum === null) {
        setTimeout(getGameInfo, 1000);
        return;
    }

    if (!localStorage.getItem("duelsinfo")) {
        localStorage.setItem("duelsinfo", JSON.stringify({isDuelsInfo: true}));
    }

    let data = JSON.parse(localStorage.getItem("duelsinfo"));
    let duelNum = location.href.match(/duels\/(.*?)(\/|$)/)[1];

    if (searchForPlayerByGame(duelNum).length > 0) return;

    if (data[player.idNum]) {
        let playerDuels = data[player.idNum].duels;

     //   for (let n = 0; n < playerDuels.length; n++) {
     //       if (playerDuels[n].game === duelNum) return;
     //   }

        playerDuels.push({ game: duelNum, date: Date.now(), starred: false });

        let script = document.createElement("script");
        document.body.appendChild(script);
        script.type = "text/javascript";
        script.addEventListener("load", function () {
          //  let data = JSON.parse(localStorage["duelsinfo"]);
          //  let body = createMsgBody();

          //  body.header.appendChild(createPlayerInfoMsg(player.idNum));
          //  body.content.appendChild(getPlayerGames(player.idNum));

            swal({
                title: "You have played this person " + (playerDuels.length - 1) + " times.",
         //       content: body.container,
            });
        });
        script.src = "https://unpkg.com/sweetalert/dist/sweetalert.min.js";
    } else {
        data[player.idNum] = {};
        data[player.idNum].duels = [{ game: duelNum, date: Date.now(), starred: false }];
        data[player.idNum].starred = false;
    }

    localStorage.setItem("duelsinfo", JSON.stringify(data));
}

function searchForPlayerByGame(duelNum){
    /*
    tests:
        "https://www.geoguessr.com/duels/3fb0cb70-a8bf-4bee-9f14-1ee7dc9c23e4/summary" <- Didn't detect this game for some reason.
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a"
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a/"
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a/summary#_22_September_8,_2022_at_10:42_PM"
        location.href
    */

    let data = JSON.parse(localStorage.getItem("duelsinfo"));
    let playerKeys = Object.keys(data);
    let results = [];

    for (var n = 0; n < playerKeys.length; n++){
        // Check for duplicate games.
        let duels = data[playerKeys[n]];
        //duels = duels.duels;

        if (!duels.duels) continue;
        duels = duels.duels;

        for (var g = 0; g < duels.length; g++){
            console.log(duels[g].game , duelNum);
            if (duels[g].game === duelNum) {
                // Something happened this game already exists.
                console.error('Game already exists.', duelNum, "Player id:", playerKeys[n]);
                results.push({player: playerKeys[n], gameData: duels[g]});
            }
        }
    }

    return results;
}

function createMsgBody() {
    let container = document.createElement("div");
    let header = document.createElement("div");
    let content = document.createElement("div");
    content.style.cssText = `display: grid;
                             grid-template-rows: auto;
                             grid-template-columns: auto auto auto auto auto auto;
                             justify-content: center;
                             font-size : 0.9rem;
                             line-height : 1.5rem;
                             overflow : auto;
                             max-height: 500px;`;
    container.appendChild(header);
    container.appendChild(content);
    container.last = null;
    container.addEventListener('click', function(x){
        if (x.target.data){
            x.target.data.clickEvtFn.call(x.target);
            return;
        }

        if (this.last){
            this.last.style.textDecoration = "";
        }

        if (x.target.href){
            this.last = x.target;
            this.last.style.textDecoration = 'underline';
        }
    });

    return { container, header, content };
}

function createPlayerInfoMsg(body, playerId) {
    let data = JSON.parse(localStorage["duelsinfo"]);
    let starredPlayer = makeStar("player", playerId, null, data[playerId].starred);

    let _body = document.createElement("div");

    let playerInfo = document.createElement("div");
    playerInfo.style.marginBottom = "1em";
    playerInfo.innerText = "Player #:";
    playerInfo.appendChild(starredPlayer);

    let playerLink = document.createElement("a");
    playerLink.target = "_blank";
    playerLink.style.color = "rgb(55 104 241)";
    playerLink.href = "https://www.geoguessr.com/user/" + playerId;
    playerLink.innerText = playerId;
    playerInfo.appendChild(playerLink);

    let notes = makeNotesBtn(data[playerId].notes);
    notes.style.marginLeft = "10px";
    notes.addEventListener("click", function(e){
        state.push(makePlayerNotesMsg.bind(null,body, playerId));
        state[state.length-1]();
    });
    playerInfo.appendChild(notes);

    let miscMsg = document.createElement("div");
    miscMsg.innerText = "Click on games to see results:";
    miscMsg.style.marginBottom = "1em";

    _body.appendChild(playerInfo);
    _body.appendChild(miscMsg);

    return _body;
}

function getPlayerGames(body, playerId) {
    let data = JSON.parse(localStorage["duelsinfo"]);
    let div = document.createElement("div");
    let playerDuels = data[playerId].duels;

    for (let n = playerDuels.length - 1; n > -1; n--) {
        let d = "No date recorded.";

        if (playerDuels[n].date != 0) {
            d = customDate(+playerDuels[n].date);
        }

        let starredGame = makeStar("game", playerId, playerDuels[n].game, playerDuels[n].starred);
        div.appendChild(starredGame);

        let a = document.createElement("a");
        a.innerText = playerDuels.length - n + ") " + d;
        a.href = "https://www.geoguessr.com/duels/" + playerDuels[n].game + "/summary#" + d.replace(/ /g, "_");
        a.target = "_blank";
        a.style.color = "rgb(55 104 241)";
        div.appendChild(a);

        let notes = makeNotesBtn(playerDuels[n].notes);
        notes.style.marginLeft = "10px";
        notes.addEventListener("click", function(e){
            state.push(makeGameNotesMsg.bind(null,body, playerId, playerDuels[n].game));
            state[state.length-1]();
        });
        div.appendChild(notes);

        let br = document.createElement("br");
        div.appendChild(br);
    }

    return div;
}

function makePlayerNotesMsg(body, playerId) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click", function(e){
       // showPlayerInfo.bind(null, body, playerId));
        state.pop();
        state[state.length-1]();
    });
    let gameNotes = getPlayerNotes(playerId);

    body.header.innerHTML = '<div>'+playerId+'<\div>';
    body.header.appendChild(goBack);

    // body.header.appendChild(createPlayerInfoMsg(playerId));
    let textArea = document.createElement('textarea');
    textArea.style.display = "block";
    textArea.placeholder = "Enter your notes here...";
    textArea.value = gameNotes ||'';
    textArea.addEventListener('keyup', function(e){
        // Prevent letter "f" from going full screen.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    textArea.addEventListener('keydown', function(e){
        // Pressing numbers is a shortcut for emoji things.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    body.content.innerHTML = '';
    body.content.appendChild(textArea);

    let savePlayerNotes = document.createElement("a");
    savePlayerNotes.innerHTML ="Save";
    savePlayerNotes.href = "javascript: void(0)";
    savePlayerNotes.style.color = "rgb(55 104 241)";
    savePlayerNotes.style.fontSize = "0.8rem";
    savePlayerNotes.style.display = "block";
    savePlayerNotes.style.gridColumn = '1';
    savePlayerNotes.style.marginBottom = '1rem';
    savePlayerNotes.addEventListener("click", function(e){
        setPlayerNotes(playerId, textArea.value)

        textArea.style.backgroundColor = '#c3c7e9';
        setTimeout(function(){
            textArea.style.backgroundColor = '';
        }, 100);
    });

    body.content.appendChild(savePlayerNotes);

    swal({
        title: "Player notes",
        content: body.container,
    });
}

function makeGameNotesMsg(body, playerId, gameId) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click", function(e){
        //showPlayerInfo.bind(null, body, playerId));
        state.pop();
        state[state.length-1]();
    });

    let gameNotes = getGameNotes(playerId, gameId);

    body.header.innerHTML = '<div>'+customDate(gameNotes.date)+'<\div>';
    body.header.appendChild(goBack);

    // body.header.appendChild(createPlayerInfoMsg(playerId));
    let textArea = document.createElement('textarea');
    textArea.style.display = "block";
    textArea.placeholder = "Enter your notes here...";
    textArea.value = gameNotes.notes || "";
    textArea.addEventListener('keyup', function(e){
        // Prevent letter "f" from going full screen.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    body.content.innerHTML = '';
    body.content.appendChild(textArea);

    let saveGameNotes = document.createElement("a");
    saveGameNotes.innerHTML ="Save";
    saveGameNotes.href = "javascript: void(0)";
    saveGameNotes.style.color = "rgb(55 104 241)";
    saveGameNotes.style.fontSize = "0.8rem";
    saveGameNotes.style.display = "block";
    saveGameNotes.style.gridColumn = '1';
    saveGameNotes.style.marginBottom = '1rem';
    saveGameNotes.addEventListener("click", function(e){
        setGameNotes(playerId, gameId, textArea.value)

        textArea.style.backgroundColor = '#c3c7e9';
        setTimeout(function(){
            textArea.style.backgroundColor = '';
        }, 100);
    });

    body.content.appendChild(saveGameNotes);

    swal({
        title: "Game notes",
        content: body.container,
    });
}

function getPlayerNotes(playerId, gameId){
    let data = JSON.parse(localStorage["duelsinfo"]);
    return data[playerId].notes;
}

function setPlayerNotes(playerId, notes){
    let data = JSON.parse(localStorage["duelsinfo"]);

    data[playerId].notes = notes;

    localStorage.setItem("duelsinfo", JSON.stringify(data));

    return notes;
}

function getGameNotes(playerId, gameId){
    let data = JSON.parse(localStorage["duelsinfo"]);
    let duels = data[playerId].duels;
    let notes = 'No notes';
    let date = '';

    for (let n = 0; n < duels.length; n++){
        if (duels[n].game === gameId){
            notes = duels[n].notes;
            date = duels[n].date;
        }
    }

    return {notes: notes, date: date};
}

function setGameNotes(playerId, gameId, notes){
    let data = JSON.parse(localStorage["duelsinfo"]);
    let duels = data[playerId].duels;

    for (let n = 0; n < duels.length; n++){
        if (duels[n].game === gameId){
            duels[n].notes = notes;
        }
    }

    localStorage.setItem("duelsinfo", JSON.stringify(data));

    return notes;
}

function makeStar(type, playerId, gameId, colorNum) {
    let star = document.createElement("span");
    star.data = { playerId, gameId, };
    star.style.color = colors[colorNum || 0];
    star.style.marginRight = "5px";
    star.style.marginLeft = "5px";
    star.style.cursor = "pointer";
    star.style.userSelect = "none";
    star.innerHTML = colorNum ? "&starf;" : "&star;";
    star.data.clickEvtFn = (type === "game") ? _gameClickFn : _playerClickFn;

    function _gameClickFn(x) {
        let data = JSON.parse(localStorage["duelsinfo"]);
        let duels = data[this.data.playerId].duels;

        for (let m = 0; m < duels.length; m++) {
            if (duels[m].game == this.data.gameId) {
                if (duels[m].starred === undefined) {
                    duels[m].starred = 0;
                }
                duels[m].starred = duels[m].starred + 1 === colors.length ? false : duels[m].starred + 1;
                this.innerHTML = duels[m].starred > 0 ? "&starf;" : "&star;";
                this.style.color = colors[duels[m].starred || 0];
                break;
            }
        }

        localStorage["duelsinfo"] = JSON.stringify(data);
    }

    function _playerClickFn(x) {
        let data = JSON.parse(localStorage["duelsinfo"]);

        if (data[this.data.playerId].starred === undefined) {
            data[this.data.playerId].starred = 0;
        }

        data[this.data.playerId].starred = data[this.data.playerId].starred + 1 === colors.length ? false : data[this.data.playerId].starred + 1;

        localStorage["duelsinfo"] = JSON.stringify(data);

        this.innerHTML = data[this.data.playerId].starred == false ? "&star;" : "&starf;";
        this.style.color = colors[data[this.data.playerId].starred || 0];
    }

    return star;
}

function customDate(_date) {
    let options = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" };
    let d = new Date(_date);
    return d.toLocaleDateString(undefined, options);
}

function downloadObjectAsJSON(exportObj, exportName){
    //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
