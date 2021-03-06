﻿var webpage = require('webpage');
var page = webpage.create();
var fs = require('fs');
var sys =  require('system');
var base64 =  require('./module/base64.js');
var $ = require('./module/jquery-2.1.1.min');

var filmIndex = sys.args[1],
    fileName = base64.decode(sys.args[2]),
    //fileName = '%B4%D2%B4%D2%C4%C7%C4%EA',
    taskname = sys.args[4],
    changeUserMax = 20;

var taskpath = './create/' + taskname + '/',
    cookiesPath = './conf/cookies.txt',
    spiderPath =  taskpath + 'spider.txt',
    picPath = taskpath + 'screenshots/',
    htmlPath = taskpath + 'html/';

var cookies = JSON.parse(fs.read(cookiesPath));

// 百度指数必需的核心cookie，登陆百度帐号后获取
phantom.addCookie({
    'name'  : 'BDUSS',
    'value' : cookies[0],
    'domain': '.baidu.com',
    'path'  : '/'
});

var header = {
    operation: "GET",
    encoding: "utf8",
    headers: {
        "Host":	"index.baidu.com",
        "Referer": "http://index.baidu.com/?tpl=trend&word=" + fileName,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0"
    }
};

var timeout = 30 * 1000, dtimeout = 45 * 1000;
var spiderLog = {fail: 0};

page.settings.resourceTimeout = timeout;

var baiduIndexContents = [], interfaceList = [], interfaceMsgs = [];

//抓取接口文件
var captrueInterface = function( config, callback, postParam ) {
    var interfacePath = 'http://index.baidu.com/Interface/';

    var index = 0, len = config.interfaces.length;

    (function(){
        if( index < len ) {
            var args = arguments,
                targetObj = config.interfaces[index],
                key = Object.keys(targetObj)[0],
                val = targetObj[key],
                postUrl = interfacePath + val + '?' + $.param( postParam),
                innerPage = webpage.create();

            innerPage.open(postUrl, header, function (status) {

                if( status === 'success') {

                    //page.render(key + '.png');
                    var content = innerPage.evaluate(function () {
                        return document.body.innerHTML;
                    });


                    var contentJson = {};

                    try{
                        contentJson = JSON.parse( content );
                    } catch ( e ) {
                        console.log(JSON.stringify({index : filmIndex,success : false, msg : 'interface capture json parse error'}));

                        //innerPage.close();
                        phantom.exit();
                    }

                    var isComplete = ( index === len - 1 );

                    if( contentJson.data ) {

                        baiduIndexContents.push(base64.encode(JSON.stringify({
                            data : content,
                            face : key
                        })));
                        interfaceList.push(key);
                        interfaceMsgs.push(key + '.json interface suceess capture!');

                    } else {

                        //console.log(JSON.stringify({index : filmIndex, success : false,msg : 'interface capture json bad!'}));

                        //innerPage.close();
                        //phantom.exit();
                    }

                    if( isComplete ) {
                        //page.close();
                        callback && callback();
                    } else {
                        index++;

                        args.callee();
                    }

                } else {

                    console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture fail!'}));

                    //innerPage.close();
                    phantom.exit();

                }
            });

        }

    }());

};


// 入口文件，开始抓取工作
var captureIndex = 0;
var openBaiduIndex = function( settings ) {
    settings  = settings || [];
    var length = settings.length, postParam;
    if( length ){
        (function(){
            var arg = arguments;
            if( captureIndex < length ) {
                pageCof = settings[captureIndex];
                captureIndex++;
                page.onResourceReceived = function (response) {


                };
                page.open(pageCof.url + fileName, header, function(status){
                        //page.render(picPath + filmIndex + '.png');
                        //fs.write(htmlPath + filmIndex + '.html', page.content, 'w');
                        if(status == 'success' && page.title.indexOf('百度指数') > -1) {

                            var isResult = page.evaluate(function () {
                                var worlds = ['立即购买', '未被收录', '暂不提供数据', '且不提供创建新词服务'],
                                    _isResult = true,
                                    content = document.body.innerHTML,
                                    length = document.querySelectorAll('#mainWrap').length;

                                worlds.forEach(function(v){
                                    if( content.indexOf(v) != -1 ) {
                                        _isResult = false;
                                        return false;
                                    }
                                });

                                return  _isResult;
                            });

                            var proxyBlock =  page.evaluate(function () {
                                return  document.querySelectorAll('#userbar').length == 0;
                            });

                            if( proxyBlock ) {
                                console.log(JSON.stringify({index : filmIndex, block : true, success : false, msg : 'proxy ip block!!!'}));

                                phantom.exit();
                            } else {
                                if( isResult ) {
                                    // 生成接口文件
                                    var reqCount = 3, reqIndex = 0;
                                    (function(){
                                        if( reqIndex < reqCount ) {
                                            reqIndex++;
                                            postParam = page.evaluate(function() {
                                                return {
                                                    res : PPval.ppt,
                                                    res2 : PPval.res2
                                                };
                                            });
                                            if( !postParam.res || !postParam.res2 ) {
                                                arguments.callee();
                                            }
                                        }
                                    }());

                                    if( postParam.res && postParam.res2 ) {
                                        captrueInterface( pageCof, function(){
                                            arg.callee();
                                        }, postParam );
                                    } else {
                                        console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface param fetch fail!'}));
                                        phantom.exit();
                                    }



                                } else {
                                    console.log(JSON.stringify({index : filmIndex, noneres : true, success : false, msg : 'keyword none result!!!'}));
                                    phantom.exit();
                                }
                            }

                        } else {

                            if (fs.exists(spiderPath)) {
                                spiderLog = JSON.parse(fs.read(spiderPath));
                            }

                            if( spiderLog.fail < changeUserMax ){
                                spiderLog.fail++;
                            } else {
                                spiderLog.fail = 0;
                                cookies.push(cookies.shift());
                                fs.write(cookiesPath, JSON.stringify(cookies), 'w');
                            }
                            fs.write(spiderPath, JSON.stringify(spiderLog), 'w');

                            console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface open timeout!'}));

                            page.close();
                            phantom.exit();
                        }
                });
            } else {

                if( baiduIndexContents.length) {
                    var resJson = {
                        index : filmIndex,
                        success : true,
                        content : baiduIndexContents,
                        face : interfaceList,
                        msg : interfaceMsgs
                    };
                    console.log(JSON.stringify(resJson));
                } else {
                    console.log(JSON.stringify({index : filmIndex, success : false, msg : 'baiduindex data empty!!!'}));
                }

                phantom.exit();
            }

        }());
    }

};

openBaiduIndex([
    {
        url : 'http://index.baidu.com/?tpl=crowd&word=',
        index : filmIndex,
        interfaces : [
            {"Interest" : "Interest/getInterest/"},
            {"getSocial" : "Social/getSocial/"}
        ]
    }
]);

/*page.onError = function(msg, trace) {
     console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture fail!'}));
     page.close();
     phantom.exit();
 };

 phantom.onError = function(msg, trace) {
     console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture fail!'}));
     page.close();
     phantom.exit();
 };*/

/*
 page.onResourceError = function(){
     console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture fail!'}));
     page.close();
     phantom.exit();
 };
 */

page.onResourceTimeout = function(){
    console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture timeout1!'}));
    phantom.exit();
};

setTimeout(function(){
    console.log(JSON.stringify({index : filmIndex, success : false, msg : 'interface capture timeout2!'}));
    phantom.exit();

}, dtimeout);






