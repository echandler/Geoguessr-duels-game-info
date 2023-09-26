// ==UserScript==
// @name         Geoguessr duels tracker v2.6
// @namespace    Geoguessr Duels Tracker
// @version      2.6 
// @include      /^(https?)?(\:)?(\/\/)?([^\/]*\.)?geoguessr\.com($|\/.*)/
// @description  Keeps track of duels games
// @downloadURL https://github.com/echandler/Geoguessr-duels-game-info/raw/main/duelsInfo.user.js
// ==/UserScript==

let colors = ["#cdc9c9", "green", "red", "blue", "magenta", "black"];
let state = [];
let lastUrl = location.href;
let HTMLAnchorColor = "rgb(55 104 241)";

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
    // Force a test.. maybe the page was refreshed or the player enabled the script in the
    // middle of a game.
    const url = location.href;
    if (/duels/.test(url) && !/summary/.test(url) && !/team/.test(url)) {
        getGameInfo();
    }
}, 2000);

let btnXY = localStorage["duelsBtn"]? JSON.parse(localStorage["duelsBtn"]): {x: 10, y: 150};
let btn = document.createElement("button");
btn.style.cssText = "background-color: #9cc7ea; border: 1px solid #6d9bce; border-radius: 4px;position: absolute; z-index: 9999999; top: "+btnXY.y +"px; left: "+btnXY.x+"px; cursor: pointer; padding: 1px;";
btn.innerText = "Duels Info";
document.body.appendChild(btn);

if (btnXY.y < 0 || btnXY.x < 0 || btnXY.y > unsafeWindow.innerHeight || btnXY.x > unsafeWindow.innerWidth){
   // Fix for if it went off screen.
   btn.style.top = "150px";
   btn.style.left = "10px"; 
   btnXY = {x: 10, y: 150};
}

btn.addEventListener("mousedown", function(e){
    document.body.addEventListener("mousemove", mmove);
    document.body.addEventListener("mouseup", mup);
    let yy = btnXY.y - e.y;
    let xx = e.x - btnXY.x;

    function mmove(evt){
        if (Math.abs(evt.x - e.x) > 2 || Math.abs(evt.y - e.y) > 2){
           document.body.removeEventListener("mousemove", mmove);
           document.body.addEventListener("mousemove", _mmove);
        }
    }

    function _mmove(evt){
        btn.style.top = evt.y + yy + "px";
        btn.style.left = evt.x - xx + "px";
    }

    function mup(evt){
        document.body.removeEventListener("mousemove", mmove);
        document.body.removeEventListener("mousemove", _mmove);
        document.body.removeEventListener("mouseup", mup);

        if (Math.abs(evt.x - e.x) < 2 && Math.abs(evt.y - e.y) < 2){
            state = [];
            showAllGames.call(btn);
            return;
        }

        btnXY.x = evt.x - xx;
        btnXY.y = evt.y + yy;
        localStorage["duelsBtn"] = JSON.stringify(btnXY);
    }
});

async function showAllGames() {
    state.push(showAllGames);

    this.disabled = true;
    
    let script = document.createElement("script");

    document.body.appendChild(script);

    script.type = "text/javascript";
    script.addEventListener("load", async function () {
        btn.disabled = false;

        let data = await getData();

        let keys = Object.keys(data);
        let games = [];

        for (let n = 0; n < keys.length; n++) {
            if (!data[keys[n]].duels) continue;
            for (let m = 0; m < data[keys[n]].duels.length; m++) {
                let d = data[keys[n]].duels;
                if (d[m].date === undefined) continue; // Only used for one game. DELETE
                d[m].opponentId = keys[n];
                d[m].playerStarred = data[keys[n]].starred;
                d[m].opponentName = data[keys[n]].opponentName;
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
                    numSpan.style.color = HTMLAnchorColor;
                    numSpan.style.textAlign = "right";
                    body.content.insertBefore(numSpan, node);

                    let gameStar = makeStar("game", games[n].opponentId, games[n].game, games[n].starred);
                    body.content.insertBefore(gameStar, node);

                    let gameLink = document.createElement("a");
                    gameLink.innerText = d.short;
                    gameLink.href = "https://www.geoguessr.com/duels/" + games[n].game + "/summary#_" + (games.length - n) + "_"+ d.full.replace(/ /g, "_");
                    gameLink.target = "_blank";
                    gameLink.style.color = HTMLAnchorColor;
                    gameLink.style.textAlign = "justify";
                    body.content.insertBefore(gameLink, node);

                    let playerStar = makeStar("player", games[n].opponentId, null, games[n].playerStarred);
                    body.content.insertBefore(playerStar, node);

                    let opponentLink = document.createElement("a");
                    debugger;
                    opponentLink.innerText = games[n]?.opponentName?.slice(0,10) ?? "Opponent";
                    opponentLink.href = "javascript: void(0)";
                    opponentLink.style.color = HTMLAnchorColor;
                    opponentLink.style.textAlign = "justify";
                    opponentLink.addEventListener("click", function(e){
                        state.push(showPlayerInfo.bind(null, body, games[n]));
                        state[state.length-1]();
                    });

                    if (data[games[n].opponentId].notes){
                        opponentLink.title = data[games[n].opponentId].notes;
                        opponentLink.style.fontStyle = "italic";
                    }
                    body.content.insertBefore(opponentLink, node);

                    let replayLink = document.createElement("a");
                    replayLink.innerText = "Replay";
                    replayLink.href = "javascript: void(0)";
                    replayLink.style.cssText = `margin:0px 5px; color:${HTMLAnchorColor}; text-align : justify;`;
                    replayLink.style.fontStyle = games[n].replayInfo? "italic": ""; 
                    replayLink.addEventListener("click", function(e){
                        state.push(showReplayInfo.bind(null, body, games[n]));
                        state[state.length-1]();
                    });

                    body.content.insertBefore(replayLink, node);

                    let notes = makeNotesBtn(games[n].notes);
                    notes.addEventListener("click", function(e){
                        state.push(makeGameNotesMsg.bind(null, body, games[n].opponentId, games[n].game));
                        state[state.length-1]();
                    });
                //    notes.addEventListener("click", getGameNotes.bind(null, games[n].playerId, games[n].game));
                    body.content.insertBefore(notes, node);
                }
            }

            let appendMore = document.createElement("a");
            appendMore.innerText = "Show more...";
            appendMore.href = "javascript: void(0)";
            appendMore.style.color = HTMLAnchorColor;
            appendMore.style.marginRight = "10px";
            appendMore.style.textAlign = "justify";
            appendMore.style.gridColumn = "3";
            if (games.length < finish){
                appendMore.style.display = "none";
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
            downloadData.addEventListener("click", async function(){
                let DBReq = await db("get", "duelsInfo");
                if (!DBReq.result) {
                    alert("Error downloading data. There may not be any data.");
                    return;
                }
                let data = await getData();
                let date = "GeoguessrDuelsInfo1_" + customDate(Date.now()).full;
                downloadObjectAsJSON(data, date);
                alert("Replays have to be downloaded manually for now.");
            });
            body.content.appendChild(downloadData);

            let uploadData = document.createElement("a");
            uploadData.innerText = "Upload Data";
            uploadData.href = "javascript: void(0)";
            uploadData.style.color = "rgb(255 91 91)";
            uploadData.style.textAlign = "justify";
            uploadData.style.gridColumn = "5";
            uploadData.addEventListener("click", function(){
                let input = document.createElement("input");
                input.type = "file";
                input.addEventListener("change", async function(x){
                    const reader = new FileReader();
                    reader.readAsDataURL(this.files[0]);
                    reader.addEventListener("load", async (e) => {
                        //let data = atob(e.target.result.replace(/data:text\/javascript;base64,/, ""));
                        let data = atob(e.target.result.replace(/data:application\/json;base64,/, ""));
                        data = JSON.parse(data);
                        let dataKeys = Object.keys(data);

                        let DBReq = await db("get", "duelsInfo");

                        if (!DBReq.result){
                            await db("put", "duelsInfo", JSON.stringify({isDuelsInfo: true}) );
                            DBReq = await db("get", "duelsInfo");
                        }

                        let local = JSON.parse(DBReq.result.data);

                        if (!data.isDuelsInfo){
                            alert("File not correct.");
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

                        await db("put", "duelsInfo", JSON.stringify(local) );
                        alert("Looks good!");
                   });
                });

               input.click();
            });
            body.content.appendChild(uploadData);

            let searchBtn= document.createElement("a");
            searchBtn.innerText = "Search";
            searchBtn.href = "javascript: void(0)";
            //searchBtn.style.cssText = "color: rgb(255 91 91); test-align: justify; border:1px solid grey; padding: 1em;";
            searchBtn.style.cssText = "color: rgb(255 91 91); test-align: justify;";
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
    goBack.style.color = HTMLAnchorColor;
    goBack.style.fontSize = "2rem";
    goBack.style.display = "inline-block";
    goBack.style.marginBottom = "1rem";
    return goBack;
}

let searchInfo = {};

async function makeSearchWindow(body){
    let goBack = makeBackBtn();
    goBack.addEventListener("click", showAllGames);

    body.header.innerHTML = "";
    body.header.appendChild(goBack);

    body.content.innerHTML = `
        <form style="grid-column:1;">
            <input placeholder="Player #" type="input" id="playerNum" style="display:block;" value="${searchInfo.opponentId || ""}" ></input>
            <input placeholder="Game #" type="input" id="gameNum" style="display:block;" value="${searchInfo.gameId || ""}"></input>
            <button type="search" id="_searchBtn" style="display:block; cursor: pointer; border: 1px solid grey; padding: 5px;">Search</button>
        </form>
        <div style="grid-column:1;" id="searchResults"></div>
    ` ;

    setTimeout(async function () {
        // Have to wait for the innerHTML to be appended to the DOM.
        let searchBtn = document.getElementById("_searchBtn");
        searchBtn.addEventListener("click", async function (e) {
            e.preventDefault();

            let playerId = document.getElementById("playerNum").value;
            let gameId = document.getElementById("gameNum").value;
            let resultsCont = document.getElementById("searchResults");
            let results = null;

            resultsCont.innerHTML = "";

            if (playerId) {

                //let DBReq = await db("get", "duelsInfo");
                // gameInfo.replayInfo = DBReq.result ? JSON.parse(DBReq.result.data): null;

                let data = await getData();
                let pData = data[playerId];
                if (pData) {
                    let opponentLink = document.createElement("a");
                    opponentLink.innerText = "Player Info.";
                    opponentLink.href = "javascript: void(0)";
                    opponentLink.style.color = HTMLAnchorColor;
                    opponentLink.style.textAlign = "justify";
                    opponentLink.style.display = "block";
                    opponentLink.addEventListener("click", function (e) {
                        state.push(showPlayerInfo.bind(null, body, pData));
                        state[state.length - 1]();
                    });

                    if (pData.notes) {
                        opponentLink.title = pData.notes;
                    }
                    resultsCont.appendChild(opponentLink);
                }
            }

            if (gameId) {
                results = await searchForPlayerByGame(gameId);
                if (results.length !== 0) {

                    for (let n = 0; n < results.length; n++) {
                        let d = customDate(+results[n].gameData.date).full;
                        let gameLink = document.createElement("a");
                        gameLink.innerText = d;
                        gameLink.href = "https://www.geoguessr.com/duels/" + results[n].gameData.game + "/summary#_" + d.replace(/ /g, "_");
                        gameLink.target = "_blank";
                        gameLink.style.color = HTMLAnchorColor;
                        gameLink.style.textAlign = "justify";
                        gameLink.style.display = "block";
                        resultsCont.appendChild(gameLink);
                    }
                }
            }

            searchInfo = {
                playerId: playerId,
                gameId: gameId,
            };
        });
        //    body.content.appendChild(getPlayerGames(body, playerId));
    }, 500);

    swal({
        title: "Search",
        content: body.container,
    });
}

async function showPlayerInfo(body, data) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click",function(e){
        state.pop();
        state[state.length-1]();
    });

    body.header.innerHTML = "";
    body.header.appendChild(goBack);
    let infoMesg = await createPlayerInfoMsg(body, data);
    body.header.appendChild(infoMesg);

    body.content.innerHTML = "";
    body.content.appendChild(await getPlayerGames(body, data));

    swal({
        title: "Player Info.",
        content: body.container,
    });
}

async function showReplayInfo(body, gameInfo) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click", function (e) {
        state.pop();
        state[state.length - 1]();
    });

    body.header.innerHTML = "";
    body.header.appendChild(goBack);

    let headerDiv = document.createElement("div");
    headerDiv.innerHTML = `Game # <a style="color:${HTMLAnchorColor};" href="https://www.geoguessr.com/duels/${gameInfo.game}/summary">${gameInfo.game}</a><br><br>`;

    body.header.appendChild(headerDiv);

    body.content.innerHTML = "Fetching replay info...";
    console.log(gameInfo)

    swal({
        title: "Replay Info.",
        content: body.container,
    });
    
    let DBReq = await db("get", gameInfo.game);

    gameInfo.replayInfo = DBReq.result ? JSON.parse(DBReq.result.data): null;
    
    if (!gameInfo.gameData || !gameInfo.replayInfo || gameInfo?.gameData?.status != "Finished") {
        //gameInfo.replayInfo = { opponent: { id: null, replay: [] }, player: { id: null, replay: [] } };

        //        let loggedInPlayer = await getAPIInfo("loggedInPlayer");
        let duelsInfo = await getAPIInfo("duels", gameInfo.game);
         
        if (!duelsInfo?.teams) {
            body.content.innerHTML = "Couldn't get replay information.";
            return;
        }

        gameInfo.gameData = duelsInfo;

        let numOfRounds = (duelsInfo.teams[0].roundResults.length > duelsInfo.teams[1].roundResults.length)
            ? duelsInfo.teams[0].roundResults.length
            : duelsInfo.teams[1].roundResults.length;

        let player1Id = duelsInfo.teams[0].players[0].playerId;
        let player2Id = duelsInfo.teams[1].players[0].playerId;
     
        gameInfo.replayInfo = {
            [player1Id]: await getReplayInfo(player1Id, gameInfo.game, numOfRounds, (n) => { body.content.innerHTML = "Logged in player: Fetching round " + n; }),
            [player2Id]: await getReplayInfo(player2Id, gameInfo.game, numOfRounds, (n) => { body.content.innerHTML = "Opponent: Fetching round " + n; }),
        };
        
        let DBReq = await db("get", "duelsInfo");
        let storedData = JSON.parse(DBReq.result.data); 

        let duels = storedData[gameInfo.opponentId].duels;

        for (let n = 0; n < duels.length; n++) {
            if (duels[n].game === gameInfo.game) {
                duels[n].gameData = gameInfo.gameData;
//                duels[n].replayInfo = gameInfo.replayInfo;
            }
        }

        if (gameInfo.replayInfo) {
            db("put", "duelsInfo", JSON.stringify(storedData) );
            db("put", gameInfo.game, JSON.stringify(gameInfo.replayInfo) );
        }
    }

    body.content.innerHTML = "";

    if (!gameInfo.replayInfo) {
        body.content.innerHTML = "Couldn't get replay information.";
        return;
    }

    // Remove grid template so tables are inserted below each other.
    body.content.style.gridTemplateColumns = "";

    let player1Id = gameInfo.gameData.teams[0].players[0].playerId;
    let player2Id = gameInfo.gameData.teams[1].players[0].playerId;
    
    if (player1Id === gameInfo.opponentId){
        makeReplayTable(player1Id, gameInfo, gameInfo.replayInfo[player1Id]);
        makeReplayTable(player2Id, gameInfo, gameInfo.replayInfo[player2Id]);
    } else {
        makeReplayTable(player2Id, gameInfo, gameInfo.replayInfo[player2Id]);
        makeReplayTable(player1Id, gameInfo, gameInfo.replayInfo[player1Id]);
    }

    function makeReplayTable(playerId, gameInfo, telemetryArray) {
        let table = document.createElement("table");
        body.content.appendChild(table);
        
        let name = playerId === gameInfo.opponentId? gameInfo.opponentName: "Logged in player";

        let row1 = document.createElement("tr");
        row1.innerHTML = `<th colspan="2"><a style="color: ${HTMLAnchorColor};" href="https://www.geoguessr.com/user/${playerId}">${name}</a></th>`;
        table.appendChild(row1);

        for (let n = 0; n < telemetryArray.length; n++) {
            let row = document.createElement("tr");
            let td1 = document.createElement("td");
            td1.style.cssText = `padding: 5px; border: 1px solid rgb(0.9, 0.9, 0.9); border-radius: 5px;cursor: pointer;`;
            td1.innerText = "Play round " + (n + 1);
            td1.addEventListener("click", () => {
                //showReplay(playerId, telemetryArray[n], n + 1);
                showReplay(playerId, name, JSON.parse(input.value), n + 1);
            });

            let td2 = document.createElement("td");
            let input = document.createElement("input");
            input.value = JSON.stringify(telemetryArray[n]);
            td2.appendChild(input);

            row.appendChild(td1);
            row.appendChild(td2);
            table.appendChild(row);
        }
    }

    function showReplay(playerId, name, telemetry, roundNum) {
        if (!unsafeWindow?.google){
            alert("Can't find google maps, open a game page with streetview and try again.");
            return;
        }

        let modal = document.createElement("dialog");
        modal.style.cssText = `height: 90%; width: 90%; border-radius: 10px; display:flex;`;
        document.body.appendChild(modal);

        let header = document.createElement("header");
        header.style.cssText = `position: absolute; background: white; z-index: 99999; padding: 10px; border: 1px solid rgb(200,200,200); border-radius: 10px; left: 20%; top: 5px;`;
        header.innerHTML = `${name} - Round ${roundNum}`;

        modal.appendChild(header);

        let closeModalBtn = document.createElement("button");
        closeModalBtn.style.cssText = `padding: 5px; border: 1px solid grey;cursor: pointer;`;
        closeModalBtn.innerText = "Close";
        closeModalBtn.addEventListener("click",() => {
            modal.close();
            modal.remove(); 
        });

        modal.appendChild(closeModalBtn);

        let svDiv = document.createElement("div");
        svDiv.style.cssText = `width: 50%;`;
        modal.appendChild(svDiv);

        let panorama = new google.maps.StreetViewPanorama(
            svDiv,
            {},
        );

        let mapDiv = document.createElement("div");
        mapDiv.style.cssText = `width: 50%; display: inline;`;

        let map = new google.maps.Map(mapDiv, {
            center: { lat: 0, lng: 0 },
            zoom: 1,
        });

        modal.appendChild(mapDiv);

        let btnContainer = document.createElement("div");
        btnContainer.style.cssText = `position: absolute; bottom: 10%; left: 20%; display: flex; z-index: 99999; width:20%;`;

        modal.appendChild(btnContainer);

        let playBtn = document.createElement("button");
        playBtn.style.cssText = `background-color: white; padding: 1em`;
        playBtn.innerText = "Play";

        playBtn.pause = function(){
             isPlaying = false;
             playBtn.innerText = "Play";
        } ;

        playBtn.addEventListener("click", () => {
            clearTimeout(interval);

            if (marker && stateIdx <= 0) {
                marker.setMap(null);
                marker = null;
            }

            if (isPlaying === false) {
                if (stateIdx >= state.length){
                    stateIdx = 0;
                }

                playBtn.innerText = "Pause";
                isPlaying = true;
                playIt();
            } else {
                playBtn.innerText = "Play";
                isPlaying = false;
            }
        });

        btnContainer.appendChild(playBtn);

        let slider = document.createElement("input");
        slider.type = "range";
        slider.value = "0";
        slider.min = "0";
        slider.step = "1";
        slider.addEventListener("mousedown", (evt) => {
             playBtn.pause();
        });

        slider.addEventListener("change", (evt) => {
             stateIdx = parseInt(slider.value);             
             playOneFrame(state[stateIdx]);
        });
        
        btnContainer.appendChild(slider);

        let isPlaying = false;
        let interval = null;
        let marker = null;
        let stateIdx = 0;
        let state = [];
        
        makeFrames(0); 

        slider.max = state.length-1 +"";

        stateIdx = 0; 
        
        // Show first frame.
        playOneFrame(state[stateIdx]);

        function playIt(){

            let time = state[stateIdx].time;

            if (stateIdx >= state.length) return;

            slider.value = stateIdx +"";  

            let _s = state[++stateIdx];
             
            if (stateIdx >= state.length) {
                isPlaying = false;
                playBtn.innerText = "Play";
                return;
            }

            playOneFrame(_s);

            if (isPlaying) {
                interval = setTimeout(playIt, state[stateIdx].time - time);
            }
        }

       function playOneFrame(state){
            panorama.setPano(state.pano);
            panorama.setPov(state.pov);
            panorama.setZoom(state.zoom);

            map.setCenter(state.mapCenter);
            map.setZoom(state.mapZoom);

            if (!state.pinPos && marker) {

                marker.setMap(null);
                marker = null;
            } else {

                if (marker == null) {

                    marker = new google.maps.Marker({
                        map,
                        title: "Hello World!",
                    });
                }

                marker.setPosition(state.pinPos);
            }
        }

        function makeFrames(idx) {
            let time = /pano/i.test(telemetry[idx].type) ? telemetry[idx].time : null;
            let isSet = false;
            let curState = {...(state[stateIdx-1] || {})};      

            for (; idx < telemetry.length; idx++) {
                let type = telemetry[idx].type;
                let panoData = /pano/i.test(type);

                if (panoData) {
                    if (isSet && telemetry[idx].time > time) break;
                       
                    if (/position/i.test(type)) {
                        curState.pano = telemetry[idx].payload.panoId;
                        isSet = true;
                        time = telemetry[idx].time;
                    } else if (/pov/i.test(type)) {
                        curState.pov = telemetry[idx].payload;
                        isSet = true;
                        time = telemetry[idx].time;
                    } else if (/zoom/i.test(type)) {
                        curState.zoom = telemetry[idx].payload.zoom;
                        isSet = true;
                        time = telemetry[idx].time;
                    }
                } else {
                    if (/PinPosition/i.test(type)) {
                        curState.pinPos = telemetry[idx].payload;
                        time = telemetry[idx].time;
                        break;
                    } else if (/position/i.test(type)) {
                        curState.mapCenter = telemetry[idx].payload;
                        time = telemetry[idx].time;
                        break;
                    } else if (/zoom/i.test(type)) {
                        curState.mapZoom = telemetry[idx].payload.zoom;
                        time = telemetry[idx].time;
                        break;
                    }
                }
            }

            curState.time = time;

            if (!state[stateIdx]){
                state[stateIdx] = curState;
            }

            stateIdx += 1;

            if (idx + 1 >= telemetry.length) {
                return;
            }

            if (!/pano/i.test(telemetry[idx].type)) idx++;

            makeFrames(idx);
        }

        modal.showModal();
    }
}

function makeNotesBtn(noteText){
    let notes = document.createElement("a");
    notes.innerText = "Notes";
    notes.href = "javascript: void(0)";
    notes.style.color = HTMLAnchorColor;
    notes.style.textAlign = "justify";
    if (noteText){
        notes.title = noteText;
        notes.style.fontStyle = "italic";
        //notes.innerText = "Noteṡ";
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

async function getGameInfo() {
    let anchors = document.body.querySelectorAll("a");
    let opponent = { name: null, idNum: null };

    for (let n = 0; n < anchors.length; n++) {
        if (/user/.test(anchors[n].href)) {
            if (anchors[n].children.length > 0 && /user-nick/i.test(anchors[n].children[0].innerHTML)) {
                if (!searchElementForNewPlayer(anchors[n])){
                    setTimeout(getGameInfo, 1000);
                    return;
                }
                opponent.opponentName = anchors[n].innerText;
                opponent.idNum = anchors[n].href.match(/user\/(.*)/)[1];
            }
        }
    }

    if (opponent.idNum === null) {
        setTimeout(getGameInfo, 1000);
        return;
    }

    let data = await getData();

    let duelNum = location.href.match(/duels\/(.*?)(\/|$)/)[1];

    let alreadyPlayedThisMap = await searchForPlayerByGame(duelNum, data);
    if (alreadyPlayedThisMap.length > 0) {
        // Player refreshed screen on already played game maybe???
        return;
    }

    if (data[opponent.idNum]) {
        let playerDuels = data[opponent.idNum].duels;

     //   for (let n = 0; n < playerDuels.length; n++) {
     //       if (playerDuels[n].game === duelNum) return;
     //   }

        playerDuels.push({ game: duelNum, date: Date.now(), starred: false });

        let script = document.createElement("script");
        document.body.appendChild(script);
        script.type = "text/javascript";
        script.addEventListener("load", function () {
          //  let body = createMsgBody();

          //  body.header.appendChild(createPlayerInfoMsg(opponent.idNum));
          //  body.content.appendChild(getPlayerGames(opponent.idNum));

            swal({
                title: "You have played this person " + (playerDuels.length - 1) + " times.",
         //       content: body.container,
            });
        });
        script.src = "https://unpkg.com/sweetalert/dist/sweetalert.min.js";
    } else {
        data[opponent.idNum] = {};
        data[opponent.idNum].duels = [{ game: duelNum, date: Date.now(), starred: false }];
        data[opponent.idNum].starred = false;
        data[opponent.idNum].opponentName = await getName(opponent.idNum);
    }

    db("put", "duelsInfo", JSON.stringify(data));
}

async function getName(id){

    let url = `https://geoguessr.com/api/v3/search/user?q=${id}`;
        let req = await fetch(url, {
            "method": "GET",
            "credentials": "include",
            "headers": {
                "Content-Type": "application/json",
                "X-Client": "web"
            }}).then((res)=> res.json()).catch(()=> null);;

    if (!req[0]?.name) return null;
    return req[0].name;
}

async function searchForPlayerByGame(duelNum, _data){
    /*
    tests:
        "https://www.geoguessr.com/duels/3fb0cb70-a8bf-4bee-9f14-1ee7dc9c23e4/summary" <- Didn't detect this game for some reason.
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a"
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a/"
        "https://www.geoguessr.com/duels/e76e6aed-5fad-4700-978e-5b7a318b6c1a/summary#_22_September_8,_2022_at_10:42_PM"
        location.href
    */

    let data = await getData();
    let playerKeys = Object.keys(data);
    let results = [];

    for (var n = 0; n < playerKeys.length; n++){
        // Check for duplicate games.
        let duels = data[playerKeys[n]];
        //duels = duels.duels;

        if (!duels.duels) continue;
        duels = duels.duels;

        for (var g = 0; g < duels.length; g++){

            if (duels[g].game === duelNum) {
                // Something happened this game already exists.
                console.error("Game already exists.", duelNum, "Player id:", playerKeys[n]);
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
                             grid-template-columns: auto auto auto auto auto auto auto;
                             justify-content: center;
                             font-size : 0.9rem;
                             line-height : 1.5rem;
                             overflow : auto;
                             max-height: 500px;`;
    container.appendChild(header);
    container.appendChild(content);
    container.last = null;
    container.addEventListener("click", function(x){
        if (x.target.data){
            x.target.data.clickEvtFn.call(x.target);
            return;
        }

        if (this.last){
            this.last.style.textDecoration = "";
        }

        if (x.target.href){
            this.last = x.target;
            this.last.style.textDecoration = "underline";
        }
    });

    return { container, header, content };
}

async function createPlayerInfoMsg(body, _data) {

    let data = await getData();
    let starredPlayer = makeStar("player", _data.opponentId, null, data[_data.opponentId].starred);

    let _body = document.createElement("div");

    let playerInfo = document.createElement("div");
    playerInfo.style.marginBottom = "1em";
    playerInfo.innerText = "Player:";
    playerInfo.appendChild(starredPlayer);

    let playerLink = document.createElement("a");
    playerLink.target = "_blank";
    playerLink.style.color = HTMLAnchorColor;
    playerLink.href = "https://www.geoguessr.com/user/" + _data.opponentId;
    playerLink.innerText = _data.opponentName || _data.opponentId;
    playerInfo.appendChild(playerLink);

    let notes = makeNotesBtn(data[_data.opponentId].notes);
    notes.style.marginLeft = "10px";
    notes.addEventListener("click", function(e){
        state.push(makePlayerNotesMsg.bind(null,body, _data.opponentId));
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

async function getData(){
    let DBReq = await db("get", "duelsInfo");
    if (!DBReq.result){
        await db("put", "duelsInfo", JSON.stringify({isDuelsInfo: true}) );
        DBReq = await db("get", "duelsInfo");
    }
    
    return JSON.parse(DBReq.result.data);
}

async function getPlayerGames(body, _data) {

    let data = await getData();
    let div = document.createElement("div");
    let playerDuels = data[_data.opponentId].duels;

    for (let n = playerDuels.length - 1; n > -1; n--) {
        let d = "No date recorded.";

        if (playerDuels[n].date != 0) {
            d = customDate(+playerDuels[n].date);
        }

        playerDuels[n].opponentId = _data.opponentId;
        playerDuels[n].opponentName = _data.opponentName;

        let starredGame = makeStar("game", _data.opponentId, playerDuels[n].game, playerDuels[n].starred);
        div.appendChild(starredGame);

        let a = document.createElement("a");
        a.innerText = playerDuels.length - n + ") " + d.short;
        a.href = "https://www.geoguessr.com/duels/" + playerDuels[n].game + "/summary#" + d.full.replace(/ /g, "_");
        a.target = "_blank";
        a.style.color = HTMLAnchorColor;
        div.appendChild(a);

                    let replayLink = document.createElement("a");
                    replayLink.innerText = "Replay";
                    replayLink.href = "javascript: void(0)";
                    replayLink.style.cssText = `margin:0px 5px; color:${HTMLAnchorColor}; text-align : justify;`;
                    replayLink.style.fontStyle = _data.replayInfo? "italic": ""; 
                    replayLink.addEventListener("click", function(e){
                        debugger;
                        state.push(showReplayInfo.bind(null, body, playerDuels[n]));
                        state[state.length-1]();
                    });

        div.appendChild(replayLink);

        let notes = makeNotesBtn(playerDuels[n].notes);
        notes.style.marginLeft = "10px";
        notes.addEventListener("click", function(e){
            state.push(makeGameNotesMsg.bind(null,body, _data.opponentId, playerDuels[n].game));
            state[state.length-1]();
        });
        div.appendChild(notes);

        let br = document.createElement("br");
        div.appendChild(br);
    }

    return div;
}

async function makePlayerNotesMsg(body, playerId) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click", function(e){
       // showPlayerInfo.bind(null, body, playerId));
        state.pop();
        state[state.length-1]();
    });
    let gameNotes = await getPlayerNotes(playerId);

    body.header.innerHTML = "<div>"+playerId+"<\div>";
    body.header.appendChild(goBack);

    // body.header.appendChild(createPlayerInfoMsg(playerId));
    let textArea = document.createElement("textarea");
    textArea.style.display = "block";
    textArea.placeholder = "Enter your notes here...";
    textArea.value = gameNotes ||"";
    textArea.addEventListener("keyup", function(e){
        // Prevent letter "f" from going full screen.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    textArea.addEventListener("keydown", function(e){
        // Pressing numbers is a shortcut for emoji things.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    body.content.innerHTML = "";
    body.content.appendChild(textArea);

    let savePlayerNotes = document.createElement("a");
    savePlayerNotes.innerHTML ="Save";
    savePlayerNotes.href = "javascript: void(0)";
    savePlayerNotes.style.color = HTMLAnchorColor;
    savePlayerNotes.style.fontSize = "0.8rem";
    savePlayerNotes.style.display = "block";
    savePlayerNotes.style.gridColumn = "1";
    savePlayerNotes.style.marginBottom = "1rem";
    savePlayerNotes.addEventListener("click", function(e){
        setPlayerNotes(playerId, textArea.value)

        textArea.style.backgroundColor = "#c3c7e9";
        setTimeout(function(){
            textArea.style.backgroundColor = "";
        }, 100);
    });

    body.content.appendChild(savePlayerNotes);

    swal({
        title: "Player notes",
        content: body.container,
    });
}

async function makeGameNotesMsg(body, playerId, gameId) {
    let goBack = makeBackBtn();
    goBack.addEventListener("click", function(e){
        //showPlayerInfo.bind(null, body, playerId));
        state.pop();
        state[state.length-1]();
    });

    let gameNotes = await getGameNotes(playerId, gameId);

    body.header.innerHTML = "<div>"+customDate(gameNotes.date).full+"<\div>";
    body.header.appendChild(goBack);

    // body.header.appendChild(createPlayerInfoMsg(playerId));
    let textArea = document.createElement("textarea");
    textArea.style.display = "block";
    textArea.placeholder = "Enter your notes here...";
    textArea.value = gameNotes.notes || "";
    textArea.addEventListener("keyup", function(e){
        // Prevent letter "f" from going full screen.
        e.stopImmediatePropagation();
        e.stopPropagation();
    });

    body.content.innerHTML = "";
    body.content.appendChild(textArea);

    let saveGameNotes = document.createElement("a");
    saveGameNotes.innerHTML ="Save";
    saveGameNotes.href = "javascript: void(0)";
    saveGameNotes.style.color = HTMLAnchorColor;
    saveGameNotes.style.fontSize = "0.8rem";
    saveGameNotes.style.display = "block";
    saveGameNotes.style.gridColumn = "1";
    saveGameNotes.style.marginBottom = "1rem";
    saveGameNotes.addEventListener("click", function(e){
        setGameNotes(playerId, gameId, textArea.value)

        textArea.style.backgroundColor = "#c3c7e9";
        setTimeout(function(){
            textArea.style.backgroundColor = "";
        }, 100);
    });

    body.content.appendChild(saveGameNotes);

    swal({
        title: "Game notes",
        content: body.container,
    });
}

async function getPlayerNotes(playerId, gameId){
    let data = await getData();
    return data[playerId].notes;
}

async function setPlayerNotes(playerId, notes){
    let data = await getData();

    data[playerId].notes = notes;
    
    db("put", "duelsInfo", JSON.stringify(data));

    return notes;
}

async function getGameNotes(playerId, gameId){
    let data = await getData();
    let duels = data[playerId].duels;
    let notes = "No notes";
    let date = "";

    for (let n = 0; n < duels.length; n++){
        if (duels[n].game === gameId){
            notes = duels[n].notes;
            date = duels[n].date;
        }
    }

    return {notes: notes, date: date};
}

async function setGameNotes(playerId, gameId, notes){
    let data = await getData();
    let duels = data[playerId].duels;

    for (let n = 0; n < duels.length; n++){
        if (duels[n].game === gameId){
            duels[n].notes = notes;
        }
    }

    db("put", "duelsInfo", JSON.stringify(data));

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

    async function _gameClickFn(x) {
        let data = await getData();
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

        db("put", "duelsInfo", JSON.stringify(data));
    }

    async function _playerClickFn(x) {
        let data = await getData();

        if (data[this.data.playerId].starred === undefined) {
            data[this.data.playerId].starred = 0;
        }

        data[this.data.playerId].starred = data[this.data.playerId].starred + 1 === colors.length ? false : data[this.data.playerId].starred + 1;

        db("put", "duelsInfo", JSON.stringify(data));

        this.innerHTML = data[this.data.playerId].starred == false ? "&star;" : "&starf;";
        this.style.color = colors[data[this.data.playerId].starred || 0];
    }

    return star;
}

function customDate(_date) {
    let options_full = { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" };
    let options_short = { month: "short", day: "numeric", hour: "numeric", minute: "numeric" };
    let d = new Date(_date);
    return { short: d.toLocaleDateString(undefined, options_short), full: d.toLocaleDateString(undefined, options_full) };
}

function downloadObjectAsJSON(exportObj, exportName){
    //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  async function getAPIInfo(api, gameId){
        let url = api === "loggedInPlayer"
                ? `https://geoguessr.com/api/v3/profiles`
                : `https://game-server.geoguessr.com/api/duels/${gameId}`;

        let info = await fetch(url, {
            "method": "GET",
            "credentials": "include",
            "headers": {
                "Content-Type": "application/json",
                "X-Client": "web"
            }
        })
            .then((res) => res.json())
            .then(json => json)
            .catch((error) => null);

       return info;
    }

    async function getReplayInfo(playerId, gameId, numRounds, callback){
            let retArray = [];

            for (let n = 0; n < numRounds ; n++) {

                let url = `https://game-server.geoguessr.com/api/replays/${playerId}/${gameId}/${n + 1}`;
                let roundJSON = await fetch(url, {
                    "method": "GET",
                    "credentials": "include",
                    "headers": {
                        "Content-Type": "application/json",
                        "X-Client": "web"
                    }
                })
                    .then((res) => res.json())
                    .then(json => json)
                    .catch((error) => null);

                //if (roundJSON === null) break;

                callback(n+1);

                retArray.push(roundJSON);
            }
            
            return retArray;
    }

        async function db(type, id, data){
            return new Promise(function(res, reg){
                var request = indexedDB.open("duelsTracker", 1);

                request.onupgradeneeded = async function(){
                    let db = request.result;
                    let store = db.createObjectStore("duelsTracker_store", {keyPath:"id"});
                    store.createIndex("replayData", ["gameId"], {unique: false});
                }

                request.onsuccess = async function(){
                    const db = request.result;
                    const transact = db.transaction("duelsTracker_store", "readwrite");
                    const store = transact.objectStore("duelsTracker_store");

                    if (type == "get"){
                        let getIt = store.get(id);
                        getIt.onsuccess = function(){
                            res(getIt);

                        db.close();
                        }
                        getIt.onerror = function(){
                            res(getIt);
                        db.close();
                        }

                        return;
                    }

                    if (type == "put"){
                        store.put({id: id, data: data})
                        res();
                        db.close();
                        return;
                    }

                    if (type == "add"){
                        store.add({id: id, data: data});
                        db.close();
                    }
                }

                request.onerror = function(){
                    db.close();
                }

            });
        }
