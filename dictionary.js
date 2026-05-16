/* dictionary.js — Word loading & definition fetching */
var Dict = (function () {
    'use strict';
    var words = new Set();
    var byPrefix = {}; // { 'a': Set(['apple','ace',...]) }
    var ready = false;
    var defCache = {};

    var FALLBACK = "the,of,and,to,in,is,it,for,was,on,are,but,not,you,all,can,had,her,one,our,out,day,get,has,him,his,how,its,may,new,now,old,see,way,who,did,got,let,say,she,too,use,act,add,age,ago,air,also,any,ask,bad,bag,bar,bed,big,bit,boy,bus,buy,car,cat,city,come,cut,dark,deal,deep,door,down,draw,drop,each,east,easy,eat,edge,else,even,ever,eye,face,fact,fail,fair,fall,far,fast,feel,feet,fill,find,fine,fire,firm,fish,five,flat,flow,fly,food,foot,form,four,free,from,full,fund,gain,game,girl,give,glad,goal,goes,gold,gone,good,gray,grew,grow,guy,hair,half,hall,hand,hang,hard,harm,hate,have,head,hear,heat,help,here,hide,high,hill,hold,hole,home,hope,host,hour,huge,idea,iron,item,jack,join,jump,just,keen,keep,kept,kick,kill,kind,king,knew,know,lack,lady,laid,lake,land,lane,last,late,lead,left,lend,less,life,lift,like,line,link,list,live,long,look,lord,lose,loss,lost,love,luck,made,mail,main,make,male,many,mark,mass,mean,meet,mile,mind,mine,miss,mode,mood,moon,more,most,move,much,must,name,navy,near,neck,need,news,next,nice,nine,none,nor,nose,note,odds,off,okay,once,only,onto,open,oral,over,pace,pack,page,paid,pain,pair,palm,park,part,pass,past,path,peak,pick,pink,plan,play,plot,plus,poem,poet,poll,pool,poor,port,post,pour,pray,pull,pure,push,race,rain,rank,rare,rate,read,real,rear,rely,rest,rich,ride,ring,rise,risk,road,rock,role,roll,roof,room,root,rope,rose,round,rule,rush,safe,said,sake,sale,salt,same,sand,sang,save,seal,seat,seed,seek,seem,seen,self,sell,send,serve,set,shed,ship,shop,shot,show,shut,sick,side,sign,sing,site,size,skin,slip,slow,snow,soft,soil,sold,sole,some,son,song,soon,sort,soul,spot,star,stay,stem,step,stir,stop,such,suit,sure,swim,tail,take,tale,talk,tall,tank,tape,task,team,tell,tend,term,test,text,than,that,them,then,they,thin,this,thus,tied,till,time,tiny,told,tone,took,tool,top,tore,torn,tour,town,tree,trim,trip,true,tube,tuck,turn,twin,type,ugly,unit,upon,urge,used,user,vary,vast,very,vice,view,vote,wage,wait,wake,walk,wall,want,ward,warm,warn,wash,wave,weak,wear,week,well,went,were,west,what,when,whom,wide,wife,wild,will,wind,wine,wing,wire,wise,wish,with,wood,word,wore,work,worm,worn,wrap,yard,yeah,year,your,zone,about,above,abuse,actor,adapt,admit,adopt,adult,after,again,agent,agree,ahead,alarm,album,alert,alien,align,alive,allow,alone,along,alter,among,angel,anger,angle,angry,apart,apple,apply,arena,argue,arise,aside,asset,avoid,award,aware,basic,basis,beach,begin,being,below,bench,birth,black,blade,blame,blank,blast,blend,blind,block,blood,blown,board,bonus,booth,bound,brain,brand,brave,bread,break,breed,brief,bring,broad,broke,brown,brush,build,bunch,burst,buyer,cabin,candy,carry,catch,cause,chain,chair,cheap,check,cheek,chess,chest,chief,child,china,chose,chunk,civil,claim,class,clean,clear,climb,cling,clock,close,cloud,coach,coast,count,court,cover,crack,craft,crash,crazy,cream,creek,crime,cross,crowd,curve,cycle,daily,dance,death,debut,delay,depth,dirty,doubt,dozen,draft,drain,drama,drank,drawn,dream,dress,dried,drift,drink,drive,drove,dying,eager,early,earth,eight,elect,elite,email,empty,enemy,enjoy,enter,entry,equal,error,essay,event,every,exact,exist,extra,faith,false,fancy,fatal,fault,favor,fence,fewer,fiber,field,fifty,fight,final,first,fixed,flame,flash,fleet,flesh,float,flood,floor,force,forth,forty,forum,found,frame,fraud,fresh,front,frost,fruit,fully,funny,genre,ghost,giant,given,glass,globe,going,grace,grade,grain,grand,grant,grass,grave,great,green,greet,grief,gross,group,grown,guard,guess,guest,guide,guilt,happy,harsh,heard,heart,heavy,hence,horse,hotel,house,human,humor,ideal,image,imply,index,inner,input,issue,ivory,joint,judge,juice,knife,knock,known,label,labor,large,laser,later,laugh,layer,learn,least,leave,legal,level,light,limit,liver,lobby,local,loose,lover,lower,lucky,lunch,maker,manor,march,match,mayor,medal,media,mercy,merge,metal,meter,might,minor,minus,model,money,month,moral,motor,mount,mouse,mouth,moved,movie,music,naked,nerve,never,newly,night,noble,noise,north,noted,novel,nurse,occur,ocean,offer,often,opera,orbit,order,organ,other,ought,outer,owner,paint,panel,panic,paper,patch,pause,peace,penny,phase,phone,photo,piano,piece,pilot,pitch,place,plain,plane,plant,plate,plaza,plead,point,polar,pound,power,press,price,pride,prime,print,prior,prize,proof,proud,prove,pulse,punch,queen,quest,quick,quiet,quota,quote,radar,radio,raise,range,rapid,ratio,reach,react,realm,rebel,refer,reign,relax,reply,rider,rifle,right,rigid,rival,river,robot,rough,round,route,royal,rural,sadly,saint,salad,scale,scene,scope,score,sense,serve,seven,shade,shake,shall,shame,shape,share,sharp,sheer,sheet,shelf,shell,shift,shine,shirt,shock,shoot,shore,short,shout,sight,since,sixth,sixty,sized,skill,skull,slave,sleep,slice,slide,slope,smart,smell,smile,smoke,solid,solve,sorry,sound,south,space,spare,speak,speed,spell,spend,spent,spike,spine,split,spoke,sport,spray,squad,stack,staff,stage,stain,stake,stall,stamp,stand,stare,start,state,steal,steam,steel,steep,steer,stern,stick,stiff,still,stock,stone,stood,store,storm,story,stove,stuff,style,sugar,super,surge,swear,sweep,sweet,swept,swift,swing,sword,table,taste,teach,teeth,tempo,thick,thing,think,third,those,three,throw,thumb,tight,tired,title,today,token,total,touch,tough,tower,trace,track,trade,trail,train,trait,trash,treat,trend,trial,tribe,trick,tried,troop,truck,truly,trust,truth,tumor,twice,twist,ultra,uncle,under,union,unite,unity,until,upper,upset,urban,usage,usual,valid,value,video,virus,visit,vital,vocal,voice,voter,watch,water,weave,weigh,weird,wheat,wheel,where,which,while,white,whole,whose,woman,worry,worse,worst,worth,would,wound,write,wrote,yield,young,youth,across,action,active,actual,affair,afford,afraid,agency,amount,annual,answer,anyone,anyway,appeal,appear,around,arrive,aspect,assert,assume,attach,attack,attend,august,author,battle,beauty,become,before,behalf,behind,belong,beside,beyond,bitter,bloody,border,borrow,bottom,branch,breath,bridge,bright,broken,budget,burden,bureau,button,camera,cancel,carbon,career,castle,cattle,caught,center,chance,change,charge,chosen,circle,client,closed,closer,coffee,column,combat,comedy,coming,commit,common,comply,corner,costly,cotton,could,couple,county,course,cousin,create,credit,crisis,custom,damage,danger,debate,decade,decent,defeat,defend,define,degree,demand,denial,depend,deploy,desert,design,desire,detail,detect,device,direct,divide,domain,double,driven,driver,during,earned,editor,effect,effort,eighth,either,emerge,empire,employ,enable,ending,energy,engage,engine,enough,ensure,entire,entity,equity,escape,estate,evolve,exceed,except,excuse,expand,expect,expert,export,expose,extend,extent,fabric,facing,factor,fairly,fallen,family,famous,farmer,father,fellow,female,figure,filing,finger,finish,flower,flying,follow,forced,forest,forget,formal,former,foster,fought,fourth,freeze,french,friend,frozen,future,gained,galaxy,garden,gather,gender,gentle,german,global,golden,govern,guided,guilty,guitar,handle,happen,hardly,heaven,height,hidden,honest,horror,hunger,hunter,ignore,illegal,impact,import,impose,income,indeed,indian,indoor,infant,inform,injury,insert,inside,insist,intend,intent,invest,island,itself,jersey,keeper,ladder,lately,latest,latter,launch,lawyer,layout,leader,league,length,lesson,letter,lifted,likely,lining,liquid,listen,little,living,losing,lovely,mainly,manage,manner,manual,margin,marine,market,master,matter,medium,member,memory,mental,merely,method,middle,mighty,miller,minute,mirror,mobile,modify,moment,mother,motion,murder,museum,mutual,myself,narrow,nation,native,nature,nearby,nearly,neatly,nobody,normal,notice,notion,number,object,obtain,occupy,odd,offend,office,online,oppose,option,orange,origin,outfit,output,oxford,packed,palace,parent,partly,patent,patrol,patron,patter,pepper,period,permit,person,phrase,picked,pillow,planet,player,please,plenty,pocket,poetry,police,policy,prefer,pretty,prince,prison,profit,prompt,proper,proven,public,pursue,racial,random,rather,rating,reader,really,reason,recall,recent,record,reduce,reform,regard,regime,region,reject,relate,relief,remain,remote,remove,rental,repair,repeat,report,rescue,resign,resist,resort,result,retain,retire,return,reveal,review,reward,ribbon,rising,robust,runner,sacred,safety,sample,scheme,school,screen,search,season,second,secret,sector,secure,select,senior,series,server,settle,severe,shadow,shared,should,signal,silent,silver,simple,simply,singer,single,sister,slight,smooth,social,solely,sought,source,speech,spirit,spread,spring,square,stable,status,steady,stolen,strain,strand,stream,street,stress,strict,strike,string,stroke,strong,struck,studio,submit,sudden,suffer,summer,summit,supply,surely,survey,switch,symbol,talent,target,temple,tender,terror,thanks,thirty,threat,thrown,tissue,tongue,toward,treaty,tribal,tunnel,twelve,unfair,unique,unless,unlike,update,useful,valley,vanish,varied,vendor,versus,vessel,viewer,virgin,vision,visual,volume,walker,wander,warmth,wealth,weapon,weekly,weight,widely,window,winner,winter,wisdom,within,wonder,wooden,worker,worthy,writer,yellow";

    function _index(w) {
        words.add(w);
        var c = w[0];
        if (!byPrefix[c]) byPrefix[c] = [];
        byPrefix[c].push(w);
    }

    async function load(statusEl, bank) {
        words.clear(); byPrefix = {}; ready = false;
        bank = bank || 'full';
        var urls = bank === 'full'
            ? ['https://raw.githubusercontent.com/dwyl/english-words/refs/heads/master/words_alpha.txt']
            : bank === 'common'
            ? ['https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt']
            : bank === 'sat'
            ? ['https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt']
            : bank === 'ielts'
            ? ['https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt']
            : bank === 'niche'
            ? ['https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt']
            : [];
        var loaded = false;
        
        if (bank === 'full' && typeof WORDS_ALPHA !== 'undefined' && WORDS_ALPHA) {
            var list = WORDS_ALPHA.split(/\r?\n/);
            var count = 0;
            for (var i = 0; i < list.length; i++) {
                var w = list[i].trim().toLowerCase();
                if (w.length >= 2 && /^[a-z]+$/.test(w)) { _index(w); count++; }
            }
            if (count > 500) loaded = true;
        }

        if (!loaded) {
            for (var url of urls) {
                try {
                var r = await fetch(url);
                if (!r.ok) continue;
                var txt = await r.text();
                var list = txt.split(/\r?\n/);
                var count = 0;
                for (var i = 0; i < list.length; i++) {
                    var w = list[i].trim().toLowerCase();
                    if (w.length >= 2 && /^[a-z]+$/.test(w)) { _index(w); count++; }
                }
                if (count > 500) { loaded = true; break; }
            } catch (e) { /* try next */ }
            }
        }
        if (!loaded) {
            FALLBACK.split(',').forEach(function (w) { _index(w.trim()); });
        }
        ready = true;
        if (statusEl) {
            statusEl.textContent = words.size.toLocaleString() + ' words loaded';
            statusEl.classList.add('done');
        }
    }

    function isValid(w) { return words.has(w); }
    function isReady() { return ready; }
    function getSize() { return words.size; }

    /** Find words starting with prefix, excluding a set */
    function findWords(prefix, excludeSet, limit) {
        var c0 = prefix[0];
        if (!byPrefix[c0]) return [];
        var results = [];
        var arr = byPrefix[c0];
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].length >= prefix.length && arr[i].indexOf(prefix) === 0 && !excludeSet.has(arr[i])) {
                results.push(arr[i]);
                if (limit && results.length >= limit) break;
            }
        }
        return results;
    }

    /** Count words starting with prefix, excluding a set */
    function countWords(prefix, excludeSet) {
        var c0 = prefix[0];
        if (!byPrefix[c0]) return 0;
        var count = 0;
        var arr = byPrefix[c0];
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].length >= prefix.length && arr[i].indexOf(prefix) === 0 && !excludeSet.has(arr[i])) count++;
        }
        return count;
    }

    /** Fetch definition from free dictionary API with fallback */
    async function fetchDefinition(word) {
        if (defCache[word]) return defCache[word];
        // Primary: Free Dictionary API
        try {
            var r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
            if (r.ok) {
                var data = await r.json();
                if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
                    var m = data[0].meanings[0];
                    var pos = m.partOfSpeech || '';
                    var def = m.definitions[0].definition || '';
                    var result = { pos: pos, def: def, source: 'Free Dictionary API' };
                    defCache[word] = result;
                    return result;
                }
            }
        } catch (e) { /* fallback */ }
        // Fallback: Wiktionary
        try {
            var r2 = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word));
            if (r2.ok) {
                var data2 = await r2.json();
                for (var lang in data2) {
                    if (data2[lang] && data2[lang][0]) {
                        var entry = data2[lang][0];
                        var pos2 = entry.partOfSpeech || '';
                        var defs = entry.definitions;
                        if (defs && defs[0]) {
                            var defText = defs[0].definition.replace(/<[^>]+>/g, '');
                            var result2 = { pos: pos2, def: defText, source: 'Wiktionary' };
                            defCache[word] = result2;
                            return result2;
                        }
                    }
                }
            }
        } catch (e) { /* fallback */ }
        // Final fallback: generate a placeholder
        var fb = { pos: '', def: 'A valid English word. Definition not available offline.', source: 'local' };
        defCache[word] = fb;
        return fb;
    }

    return { load: load, isValid: isValid, isReady: isReady, getSize: getSize, findWords: findWords, countWords: countWords, fetchDefinition: fetchDefinition, words: words, byPrefix: byPrefix };
})();
