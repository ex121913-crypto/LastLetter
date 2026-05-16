var a = "abcdefghijklmnopqrstuvwxyz", r = 1, u = [], p = a[randomNumber(0, 25)], s = 0, tt = 360, ttt = 0, charNum = 0;
var valid = {}, W = {}, ready = 0, tries = 5, health = 3, start = 0, usedMap = {};

readRecords("460k", {}, function (recs) {
    if (recs.length === 0) return;

    var keys = Object.keys(recs[0]);
    var numKeys = keys.length;
    var numRecs = recs.length;

    for (var i = 0; i < numRecs; i++) {
        var row = recs[i];
        for (var j = 0; j < numKeys; j++) {
            var k = keys[j];
            if (k !== "id") {
                var rawWord = row[k];
                if (rawWord && rawWord.length > 0) {
                    var w = String(rawWord).toLowerCase();
                    valid[w] = 1;
                    var c0 = w[0];
                    var len = w.length;

                    if (!W[c0]) W[c0] = {};
                    if (!W[c0][len]) W[c0][len] = [];
                    W[c0][len].push(w);
                }
            }
        }
    }
    ready = 1;
    console.log("ready");
});
onEvent("startbutton", "click", function () {
    if (!ready) return;
    setScreen("screen2");
    charNum = randomNumber(0, 25);
    tt = 360, tries = 5, health = 3, start = 1, s = 0;
    setText("label6", "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
});


setText("prompt", p);
onEvent("text_input1", "input", function () {
    setText("prompt", p + getText("text_input1"));
});

onEvent("text_input1", "keydown", function (e) {
    var w = p + getText("text_input1");
    if (e.key == "Enter" && valid[w] && u.indexOf(w) == -1 && getText("prompt").length != 1) {
        s += 100 + getText("prompt").length * randomNumber(13, 17);
        s += getText("prompt").length * randomNumber(33, 39);
        nxt(w);
        r++;
        setText("label1", "Round " + r);
        setText("label4", "Score " + s);
        setText("label6", "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
        tt = 360, tries = 5;
    } else if (!valid[w] && e.key == "Enter") {
        ttt = tt;
        setProperty("prompt", "text-color", "red");
        tries--;
    }
});

onEvent("text_input1", "keyup", function (e) {
    if (e.key == "Enter")
        setProperty("prompt", "text-color", "white");
});

onEvent("button2", "click", function () {
    setScreen("screen2");
    charNum = randomNumber(0, 25);
    tries = 5, health = 3, start = 0;
    r = 1, u = [], s = 0, tt = 360, ttt = 0, charNum = 0;
    setText("label6", "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
    setScreen("screen1");
    updscr();
    start = 1;
});

function nxt(w) {
    appendItem(u, w);
    var l = r < 6 ? 1 : r < 11 ? 2 : randomNumber(3, 4), c = w.slice(-l), o = 0;
    usedMap[w] = l;
    var c0 = c[0];
    if (W[c0]) {
        var lengths = Object.keys(W[c0]);
        for (var j = 0; j < lengths.length; j++) {
            var len = lengths[j];
            if (len < c.length) continue;

            var lst = W[c0][len];
            var lstLen = lst.length;

            for (var i = 0; i < lstLen; i++) {
                var checkWord = lst[i];
                if (checkWord.indexOf(c) === 0 && !usedMap[checkWord]) {
                    o = 1;
                    break;
                }
            }
            if (o === 1) break;
        }
    }
    p = o ? c : a[randomNumber(0, 25)];
    setText("prompt", p);
    setText("text_input1", "");
}

function updscr() {
    setText("label6", "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
    setText("label1", "Round " + r);
    setText("label4", "Score " + s);
    setProperty("prompt", "text-color", "white");
    setProperty("h3", "icon-color", "#ffffff");
    setProperty("h2", "icon-color", "#ffffff");
    setProperty("h1", "icon-color", "#ffffff");
}

timedLoop(100, function () {
    if (start == 1) {
        if (tt > 0) {
            tt -= 1;
            setText("label5", tt / 10);
        } else if (tt == 0 && health > 0) {
            health--;
            r++;
            nxt(a[randomNumber(0, 25)]);
            setText("label6", "llllllllllllllllllllllllllllllllllllllllllllllllllllllllllll");
            tt = 360, tries = 5;
            setText("label1", "Round " + r);
        }
        if (tt % 6 == 0) {
            setText("label6", getText("label6").slice(0, getText("label6").length - 1));
        }
        if (tries === 5) {
            setText("label7", "⬤⬤⬤⬤⬤");
        } else if (tries === 4) {
            setText("label7", "⬤⬤⬤⬤◯");
        } else if (tries === 3) {
            setText("label7", "⬤⬤⬤◯◯");
        } else if (tries === 2) {
            setText("label7", "⬤⬤◯◯◯");
        } else if (tries === 1) {
            setText("label7", "⬤◯◯◯◯");
        } else if (tries === 0) {
            setText("label7", "◯◯◯◯◯");
            nxt(a[randomNumber(0, 25)]);
            tries = 5;
            r++;
            tt = 360;
            setText("label1", "Round " + r);
            health--;
        }
        if (health === 2) {
            setProperty("h3", "icon-color", "#000000");
        } else if (health === 1) {
            setProperty("h2", "icon-color", "#000000");
        } else if (health === 0) {
            setProperty("h1", "icon-color", "#000000");
            start = 0;
            setText("label10", ("Score: " + s));
            setText("label9", ("Round: " + r));
            setScreen("screen3");
        }
    }
});
