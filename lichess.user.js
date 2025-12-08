// ==UserScript==
// @name         Lichess Funnies
// @version      13
// @description  Plays chess for you on lichess
// @author       Michael and Ian
// @match        https://lichess.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lichess.org
// @grant        none
// @updateURL    https://github.com/mchappychen/lichess-funnies/blob/main/lichess.user.js
// @downloadURL  https://github.com/mchappychen/lichess-funnies/blob/main/lichess.user.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/chess.js
// @require      https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/stockfish.js
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements, Chess, stockfish, lichess, game */

//Don't run in lobby
if (window.location.href == 'https://lichess.org/'){return}

window.lichess = window.site;

//Stockfish engine and FEN generator
window.game = new Chess();

//Set variable for autorun
var autoRun = localStorage.getItem('autorun') ?? "0";
console.log(autoRun);

function run(){

    //For puzzles
    if (window.location.href.startsWith('https://lichess.org/training')){

        //Returns xy coord for arrow
        function getArrowCoords(square,color){
            //square is like "a1"
            let bottom = square.substring(0,1).toLowerCase();
            let x = bottom == "a" ? -3.5 :
            (bottom == "b" ? -2.5 :
             (bottom == "c" ? -1.5 :
              (bottom == "d" ? -0.5 :
               (bottom == "e" ? 0.5 :
                (bottom == "f" ? 1.5 :
                 (bottom == "g" ? 2.5 : 3.5))))));
            let right = square.substring(1,2);
            let y = right == "1" ? 3.5 :
            (right == "2" ? 2.5 :
             (right == "3" ? 1.5 :
              (right == "4" ? 0.5 :
               (right == "5" ? -0.5 :
                (right == "6" ? -1.5 :
                 (right == "7" ? -2.5 : -3.5))))));
            //if you're black, invert them
            if (color == "black"){x = -x;y = -y;}
            return [x,y];
        }

        var puzzle = function(){
            let gamePuzzle = new Chess();
            let moves = $('move');
            for(let i=0;i<moves.length;i++){
                gamePuzzle.move(moves[i].textContent.replace('✓',''));
            }
            stockfish.postMessage('position fen '+gamePuzzle.fen());
            let depth = $('#engineDepth')[0].value;
            stockfish.postMessage('go depth '+depth);
            $("#engineStatus")[0].innerText = "Running...";
        }
        stockfish.onmessage = function(event) {
            if(event.data.substring(0,8) == "bestmove"){
                let bestMove = event.data.split(" ")[1];
                $('g')[0].innerHTML = '';
                let arrowCoords1;
                let arrowCoords2;
                if($('.cg-wrap')[0].classList[1] == 'orientation-white' || $('.cg-wrap')[0].classList[2] == 'orientation-white'){
                    arrowCoords1 = getArrowCoords(bestMove.substring(0,2),'white');
                    arrowCoords2 = getArrowCoords(bestMove.substring(2),'white');
                } else {
                    arrowCoords1 = getArrowCoords(bestMove.substring(0,2),'black');
                    arrowCoords2 = getArrowCoords(bestMove.substring(2),'black');
                }
                $('g')[0].innerHTML += '<line stroke="#15781B" stroke-width="0.2" stroke-linecap="round" marker-end="url(#arrowhead-g)" opacity="1" x1="'+arrowCoords1[0]+'" y1="'+arrowCoords1[1]+'" x2="'+arrowCoords2[0]+'" y2="'+arrowCoords2[1]+'"></line>';
                $('g')[0].innerHTML += '<circle stroke="#15781B" stroke-width="0.07" fill="lime" opacity="0.8" cx="'+arrowCoords1[0]+'" cy="'+arrowCoords1[1]+'" r="0.4" ></circle>';
                $('g')[0].innerHTML += '<circle stroke="#15781B" stroke-width="0.07" fill="red" opacity="0.5" cx="'+arrowCoords2[0]+'" cy="'+arrowCoords2[1]+'" r="0.4" ></circle>';
                $('defs')[0].innerHTML += '<marker id="arrowhead-g" orient="auto" markerWidth="4" markerHeight="8" refX="2.05" refY="2" cgKey="g"><path d="M0,0 V4 L3,2 Z" fill="#15781B"></path></marker>';
                if($('div.vote')[0]){
                    $('div.vote')[0].click();
                }
                $("#engineStatus")[0].innerText = "IDLE";
            }
        };
        $(document).on("keydown", function(event) {
            if (event.key == "w") {
                puzzle();
            }
        });
        //Create panel
        let engineStatus = document.createElement('div');
        engineStatus.innerHTML = '<div class="infos puzzle" style="font-size:26px">Engine Status:  <span id="engineStatus">IDLE</span></div>';
        let engineDepth = document.createElement('div');
        engineDepth.innerHTML = '<div class="infos puzzle" style="font-size:26px">Engine Depth:<input id="engineDepth"type="number" min="1" max="99" value="23"></div>'
        let message = document.createElement('div');
        message.innerHTML = '<div class="infos puzzle" style="font-size:18px">Press w to start</div>';
        $('aside div.puzzle__side__metas')[0].prepend(message);
        $('aside div.puzzle__side__metas')[0].prepend(engineStatus);
        $('aside div.puzzle__side__metas')[0].prepend(engineDepth);
        let observer = new MutationObserver(function(mutationsList) {
            for (let mutation of mutationsList) {
                if (mutation.type === "childList" && mutation.addedNodes.length>0) {
                    $('g')[0].innerHTML = '';
                    if(mutation.addedNodes[0].innerText.includes('Continue training')){
                        $('div.vote')[0].click();
                    } else if (mutation.addedNodes[0].innerText.includes('Keep going…')){
                        setTimeout(puzzle,800);
                    } else if (mutation.addedNodes[0].innerText.includes('Your turn')){
                        setTimeout(puzzle,400);
                    }
                }
            }
        });
        observer.observe($('div.puzzle__tools')[0], { childList: true });
        return
    }


    //You can load an opening book with this (may not be working)
    //stockfish.postMessage('setoption name BookFile value https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/Human.bin');

    //sends message to chat
    function send(x) {
        try{
            $(".mchat__tabs")[0].children[0].click();
            var event = new KeyboardEvent('keydown', {key: 'Enter',keyCode: 13,which: 13,bubbles: true,cancelable: true,});
            $('.mchat__say')[0].value = x;
            var element = $('.mchat__say')[0];
            element.dispatchEvent(event);
        } catch {console.log('Error, couldn\'t send message')}
    }

    var autoHint = autoRun == "1";
    const moveObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if(mutation.addedNodes.length == 0){return}
            if( mutation.addedNodes[0].tagName == "I5Z"){continue}
            //$('g')[0].innerHTML = ''; //removes board arrows/circles
            //If game is over

            //Get last move
            let lastMove = $('l4x')[0].lastChild;

            //Update our game board
            game.move(lastMove.textContent);
            //If we're white, only get black moves. Vice versa
            if ($('.cg-wrap')[0].classList[1] == 'orientation-white' && mutation.target.children.length%3!=0){
                return
            }
            if ($('.cg-wrap')[0].classList[1] == 'orientation-black' && mutation.target.children.length%3==0){
                return
            }

            if (autoHint){
                stockfish.postMessage('position fen '+game.fen());
                var time = $("div.time")[1].innerText.split("\n");
                if (game.history().length < 12){
                    stockfish.postMessage('go depth 6');
                } else if (parseInt(time[0])*60 + parseInt(time[2]) < 2){
                    stockfish.postMessage('go depth 5 movetime 50');
                } else {
                    stockfish.postMessage('go depth 10');
                }
            }
        }

    });
    moveObserver.observe($('rm6')[0], {childList: true,subtree: true});

    const endObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if($('div.rcontrols')[0].textContent.includes("Rematch")){
                lichess.socket.send( "rematch-yes" );
                send("GG. Finding new opponent in 8 seconds...");
                setTimeout(function(){$('a.fbt[href^="/?hook_like"]')[0].click()},8000);
                endObserver.disconnect();
            }
        }
    });
    endObserver.observe($('div.rcontrols')[0],{childList: true,subtree: true})

    stockfish.onmessage = function(event) {
        if(event.data.substring(0,8) == "bestmove"){
            let bestMove = event.data.split(" ")[1];
            console.log('bestmove',bestMove)
            lichess.socket.averageLag = 1200; // trick lichess to give us more time thinking we're lagging
            lichess.socket.send('move', { u: bestMove }, { ackable: true, sign:lichess.socket._sign, withLag:true }); //sign:lichess.socket._sign tricks lichess so our socket won't get destroyed? Or is it cause we're shadowbanned?
            //Note - according to lichess.socket code:
            //we may need to delete socket.rep.${Math.round(Date.now() / 3600 / 3)} from localStorage each time we call lichess.socket.send() to avoid disconnects
        }
    };

    //Add stockfish hint button
    let sfbutton = document.createElement('button');
    sfbutton.innerText = 'Hint';
    sfbutton.classList.add('fbt');
    sfbutton.onclick=function(){
        stockfish.postMessage('position fen '+game.fen());
        stockfish.postMessage('go depth 10');
    }
    $('div .ricons')[0].appendChild(sfbutton);

    //Add button to toggle auto-hints
    let auHintButton = document.createElement('button');
    auHintButton.innerText = 'Auto-OFF';
    auHintButton.classList.add('fbt');
    auHintButton.onclick = function(){
        auHintButton.innerText = auHintButton.innerText == "AUTO-OFF" ? "Auto-ON" : "Auto-OFF";
        auHintButton.style.backgroundColor = autoHint ? "green" : "";
        autoHint = !autoHint;
        autoRun = autoRun=="1" ? "0" : "1";
        localStorage.setItem('autorun',autoRun);
    }
    $('div .ricons')[0].appendChild(auHintButton);

    //Make all buttons have a blue border when clicked
    $('.fbt').on('mousedown',function(){
        this.style.border = '6px solid blue';
        setTimeout(function(a){
            a.style.border = '';
        },500,this);
    });

    $(document).on("keydown", function(event) {
        if (event.key == "w") {
            sfbutton.click();
            auHintButton.click();
        }
    });

    if(autoRun == "1"){
        auHintButton.innerText = auHintButton.innerText == "AUTO-OFF" ? "Auto-ON" : "Auto-OFF";
        auHintButton.style.backgroundColor = autoHint ? "green" : "";
        if($('.cg-wrap')[0].classList[1] == 'orientation-white'){
            sfbutton.click();
        } else {
            let moves = $('kwdb');
            for(let i=0;i<moves.length;i++){
                game.move(moves[i].textContent.replace('✓',''));
            }
            stockfish.postMessage('position fen '+game.fen());
            sfbutton.click();
        }
    }

}
setTimeout(run,500);

