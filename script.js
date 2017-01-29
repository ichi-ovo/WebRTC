// ベンダープレフィックス部分
// （先行実装であることを示す慣習）
navigator.getUserMedia =
    navigator.getUserMedia          ||  // Specofication
    navigator.webkitGetUserMedia    ||  // Chrome
    navigator.mozGetUserMedia       ;   // Firefox

window.URL =
    window.URL          ||
    window.webkitURL    ;

window.RTCPeerConnection = 
    window.RTCPeerConnection        ||
    window.webkitRTCPeerConnection  ||
    window.mozRTCPeerConnection     ;

window.RTCSessionDescription = 
    window.RTCSessionDescription        ||
    window.webkitRTCSessionDescription  ||
    window.mozRTCSessionDescription     ;

window.RTCIceCandidate =
    window.RTCIceCandidate          ||
    window.webkitRTCIceCandidate    ||
    window.mozRTCIceCandidate       ;



var ws = null;      // WebSocketオブジェクト
var peer = null;    // RTCPeerConnection（ストリーミングを扱う）オブジェクト

// 初期化関数
function initialize(){
    // WebSocketの接続開始
    var secure = location.protocol === 'https:';
    var protocol = secure ? 'wss' : 'ws';
    var url = protocol + '://' + location.host + '/';
    ws = new WebSoket(url);

    // RTCPeerConnection初期化
    peer = new RTCPeerConnection({
        iceServers: [
            {url: 'stun:stun.l.google.com:19302'}   // STUNサーバの指定
            {url: 'stun:23.21.150.121'}             // TURNサーバの指定
        ]
    });

    // ユーザメディアの取得・表示
    navigator.getUserMedia(
        {audio: true, video:true},
        function(stream){
            var video = document.getElementById('local');
            video.src = URL.createObjectURL(stream);
            video.play();
            peer.addStream(stream);     // RTCPeerConnectionへの登録
        },
        function(error){
            console.error(error);
        }
    );

    /* --- イベントハンドラの指定（WebSocket） --- */
    // WebSocketのメッセージ受信時の処理の指定（SDP）
    ws.addEventListener('message', function(evt){
        var data = JSON.parse(evt.data);
        if(!data.sdp){ return ;}                            // SDPが含まれているかの判定、なかったら返す
        var sdp = data.sdp;
        var description = new RTCSessionDescription(sdp);   // RTCSessionDescription（SDPを扱う）の生成
        peer.setRemoteDescription(description, function(){  // RTCSessionDescriptionをPeerConnectionへ登録
            // SDPがofferならばanswerを実行
            if(description.type === 'offer'){
                anser();
            }
        });
    });

    // WebSocketのメッセージ受信時の処理の指定（経路情報）
    ws.addEventListener('message', function(evt){
        var data = JSON.parse(evt.data);
        if(!data.candidate){ reyurn; }                          // 経路情報が含まれているか判定、なかったら返す
        var candidate = new RTCIceCandidate(data.candidate);    // RTCIceCandidate（経路情報を扱う）の生成
        peer.addIceCandidate(candidate);                        // RTCIceCandidateをPeerConnectionへ登録
    });
    /* --- イベントハンドラの指定（WebSocket）　ここまで --- */

    /* --- RTCPeerConnectionにイベントハンドラを指定 --- */
    // RTCPeerConnectionの経路候補取得時の処理の指定
    peer.addEventListener('icecandidate', function(evt){
        if(!evt.candidate){ return; }                       // 経路情報が含まれているか判定、なかったら返す
        var candidate = evt.candidate;
        ws.send(JSON.stringify({candidate: candidate}));    // 対向に送信
    });

    // RTCPeerConnectionの対向取得時の処理の指定
    peer.addEventListener('addstream', function(evt){
        // 対向のMediaStreamの表示・再生
        var video = document.getElementById('remote');
        video.src = URL.createObjectURL(evt.stream);
        video.play();
    });

    // offer開始ボタンのクリック時にoffer処理を実行
    var offerbtn = document.getElementById('offer_button');
    offerbtn.addEventListener('click', offer);

    // offer処理
    function offer(){
        // offer生成
        peer.createOffer(
            // offer成功
            function(offer){
                // 取得したofferをPeerConnectionに登録
                peer.setLocalDescription(offer, function(){
                    ws.send(JSON.stringify({sdp: offer}));  // offerを対向に送信
                });
            },
            // offer失敗
            function(error){
                console.error(error);
            }
        );
    }

    // answer処理
    function answer(){
        // answerの生成
        peer.createAnswer(
            // answer成功
            function(answer){
                // 取得したanswerをPeerConnectionに登録
                peer.setLocalDescription(answer, function(){
                    ws.send(JSON.stringify({sdp: answer})); // answerを対向に送信
                });
            },
            function(error){
                console.error(error);
            }
        );
    }
}

window.addEventListener('load', initialize);
