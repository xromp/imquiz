(function(){
    angular
      .module('quizApp',['firebase', 'ui.router'])
      .controller('LandingCtrl', LandingCtrl)
      .controller('TOSCtrl', TOSCtrl)
      .config(function($stateProvider, $urlRouterProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $urlRouterProvider.otherwise('/home/play');
        $stateProvider
            .state('home', {
                url: '/home/:id',
                templateUrl: 'imquiz.html',
                controller: LandingCtrl
            })
            .state('tos', {
                url: '/tos',
                templateUrl: 'terms.html',
                controller: TOSCtrl

            });

    });

    LandingCtrl.$inject = ['$scope', '$location', '$stateParams', '$http'];
    function LandingCtrl($scope, $location, $stateParams, $http){
        let vm = this;
        const DOMAIN = 'https://imquiz-001.firebaseio.com';
        const HOSTED_DOMAIN = 'https://imquiz-001.firebaseapp.com/';
        const HOME_PAGE = HOSTED_DOMAIN + 'home/';
        const ref = firebase.database().ref();
        const questionRef = ref.child('user-answered-questions');
        vm.display = {};
        vm.shareLink = '';
        vm.mode = 'START_ANSWERING';
        vm.domain = HOSTED_DOMAIN;

        vm.init = function(){
            vm.userQuestionsId = $stateParams.id;
            const isValid = vm.userQuestionsId.includes('-imQuiz');
            if (vm.userQuestionsId && isValid) {
                const req =new Request(DOMAIN+'/user-answered-questions/'+vm.userQuestionsId+'.json', {method:'GET'});
                fetch(req)
                    .then(response => {
                        response.json().then(data => {
                            if (data) {
                                vm.mode = 'START_GUESSING';
                                vm.userQuestioners = data;
                                vm.quesser = vm.userQuestioners.quessers;
                                vm.orginUserQuestioners = angular.copy(data);
                                vm.userQuestioners.questions.map( subarray => {
                                    subarray.position = 'PENDING';
                                    subarray.options.map( item => delete item.selected );
                                });
                                vm.userQuestioners.username = '';
                                vm.userQuestioners.questions[0]['position'] = 'CURRENT';
                                $scope.$apply();
                            } else {
                                vm.mode = 'START_ANSWERING';
                            }
                        })
                    });
            }

        }();

        vm.startAnswer = function(name) {
            if (name) {
                vm.showQuestions = true;

                if (vm.mode == 'START_ANSWERING'){
                    vm.userQuestioners.questions = vm.initQuestions();
                    vm.userQuestioners.questions[0].position = 'CURRENT';
                    vm.userQuestioners.username = name;
                }

            }
        };

        vm.selected = function(option, question) {
            option.selected = true;
            question.position = 'HIDE';
            question.answered = true;
            vm.getNextQuestion();
        };

        vm.getNextQuestion = function() {
            let isCompleted = false;
            let lastQuestion = false;
            vm.userQuestioners.questions.some((question, i) => {
                if (question.position == 'PENDING') {
                    return question.position = 'CURRENT';
                } else if (i == vm.userQuestioners.questions.length -1 && question.position != 'PENDING') {
                    isCompleted = true;
                }

                if (i == vm.userQuestioners.questions.length -2) lastQuestion = true;
            });
            const answered = vm.userQuestioners.questions.filter(item => item.answered);
            const ansCount = answered.length;

            if (lastQuestion && !ansCount) return vm.isLastNoSkip= true;

            if (isCompleted && ansCount) {
                vm.display.loading = true;
                vm.display.loaded = false;
                if (vm.mode == 'START_ANSWERING') {
                    vm.noAnswered = vm.getAnsweredQuestions();
                    vm.submit();
                } else if (vm.mode == 'START_GUESSING') {
                    vm.compute();
                    vm.submitQuesser();
                }
            }
        };

        vm.skipQuestion = function() {
            vm.userQuestioners.questions.forEach(question => {
                if (question.position == 'CURRENT') {
                    question.position = 'HIDE';
                    return;
                }
            });
            vm.getNextQuestion();
        }

        vm.getAnsweredQuestions = function(){
            let count = 0;
            vm.userQuestioners.questions.forEach(question => {
                if (question.answered) count +=1;
            });

            return count;
        };

        vm.submit = function(){
            const formData = vm.userQuestioners;
            const answeredData = vm.userQuestioners.questions.filter(item => item.answered);
            formData.questions = answeredData;
            const data = angular.copy(formData);
            const key = ref.push().key + '-imQuiz';
            questionRef.child(key).set(data).then(() => {
                vm.shareLink = HOME_PAGE+key;
                $scope.fbShareLink = vm.shareLink;
                //$scope.$apply();
                (function(d, s, id) {
                    var js, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) return;
                    js = d.createElement(s); js.id = id;
                    js.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v3.1&appId=137973710136662&autoLogAppEvents=1';
                    fjs.parentNode.insertBefore(js, fjs);
                    vm.mode = 'DONE_ANSWERING';
                    vm.display.loading = false;
                    vm.display.loaded = true;
                    $scope.$apply();
                }(document, 'script', 'facebook-jssdk'));
            });
        };

        vm.submitQuesser = function() {
            let data = {
                name: vm.userQuestioners.username,
                score: vm.knowPercentage
            }
            questionRef.child(vm.userQuestionsId+'/quessers').push(data);
            $scope.fbShareLink = HOME_PAGE+vm.userQuestionsId;
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v3.1&appId=137973710136662&autoLogAppEvents=1';
                fjs.parentNode.insertBefore(js, fjs);
                vm.display.loading = false;
                vm.display.loaded = true;
                vm.mode = 'DONE_GUESSING';
                $scope.$apply();
            }(document, 'script', 'facebook-jssdk'));
        };

        vm.compute = function(){
           const origAnsCount = vm.orginUserQuestioners.questions.length;
           let quessAnsCount = 0;
           vm.orginUserQuestioners.questions.forEach((orgItem, i) => {
                const item = vm.userQuestioners.questions[i];
                const options = item.options;
                const origOption = orgItem.options;

                const userOptid =  options.filter(opt => opt.selected);
                const origOptid =  origOption.filter(opt => opt.selected);

                (userOptid[0].id == origOptid[0].id) ? quessAnsCount+=1 :'';

           });
           vm.knowPercentage = ((quessAnsCount/origAnsCount)*100).toFixed(2);
           const ref = firebase.database().ref();
           const questionRef = ref.child('user-answered-questions');
        };

        vm.initQuestions = function(){
            const questions = [
                {id: 1, desc: 'How often do I exercise?', options: [{id: 1, desc: 'Every chance I get'},{id: 2, desc: 'Often'},{id: 3, desc: 'Rarely'}]},
                {id: 2, desc: 'What is my eye color?', options: [{id: 1, desc: 'Blue'},{id: 2, desc: 'Hazel'},{id: 3, desc: 'Green'}, {id: 4, desc: 'Brown'}]},
                {id: 3, desc: 'If i had a time machine, i would', options: [{id: 1, desc: 'Travel to the past and meet ancestors'},{id: 2, desc: 'Travel to the future and meet grandchildren'}]},
                {id: 4, desc: 'What would make me most happy?', options: [{id: 1, desc: 'More sleep'},{id: 2, desc: 'Less work'},{id: 3, desc: 'More time with friends & family'}, {id: 4, desc: 'Travelling somewhere away from home'}, {id:5, desc:'More wealth'}]},
                {id: 5, desc: 'What do i want to do in life?', options: [{id: 1, desc: 'Change the world'},{id: 2, desc: 'Find Happiness'},{id: 3, desc: 'Make a lot of money'}, {id: 4, desc: 'I don\'t know'}]},

                {id: 6, desc: 'Which is more important to me: Love or money?', options: [{id: 1, desc: 'Love'},{id: 2, desc: 'Money'}]},
                {id: 7, desc: 'What would i do with an unexpected income of $1000?', options: [{id: 1, desc: 'Save it'},{id: 2, desc: 'Spend it extravagantly'},{id: 3, desc: 'Spend it for family'},{id: 4, desc: 'Eat at fancy restaurants'}]},
                {id: 8, desc: 'What is my favorite season?', options: [{id: 1, desc: 'Fall'},{id: 2, desc: 'Winter'},{id: 3, desc: 'Spring'}, {id: 4, desc: 'Summer'}]},
                {id: 9, desc: 'What do i fear?', options: [{id: 1, desc: 'Darkness'},{id: 2, desc: 'People'},{id: 3, desc: 'Nothing'}]},
                {id: 10, desc: 'Do I like girls with curly hair ?', options: [{id: 1, desc: 'Yeah'},{id: 2, desc: 'No'},{id: 3, desc: 'Kind of'}]},

                {id: 11, desc: 'Do I love tea ?', options: [{id: 1, desc: 'Yes'},{id: 2, desc: 'No'},{id: 2, desc: 'Of course yes'}]},
                {id: 12, desc: 'Can I cook ?', options: [{id: 1, desc: 'No'},{id: 2, desc: 'Yes'},{id: 3, desc: 'Probably the best in the world'}]},
                {id: 13, desc: 'Do I like dogs ?', options: [{id: 1, desc: 'Yeah. I love dogs'},{id: 2, desc: 'No'},{id: 3, desc: 'Only cute ones'}]},
                {id: 14, desc: 'Do I pray everyday ?', options: [{id: 1, desc: 'Yes'},{id: 2, desc: 'No'},{id: 3, desc: 'Sometimes '}]},
                {id: 15, desc: 'Do I love chicken?', options: [{id: 1, desc: 'Yes'},{id: 2, desc: 'No'},{id: 3, desc: 'I am addicted to it. I can’t live without eating chicken for a week'}]},
            ];

            const randomQuestions = [];
            do {
                const index = Math.floor(Math.random() * 15);
                const item = questions[index];
                const existed = randomQuestions.filter(i => i.id == item.id);

                if(!existed.length) {
                    item.position = 'PENDING';
                    randomQuestions.push(item);
                }
            }
            while (randomQuestions.length < 10);

            return randomQuestions;
        }

        vm.sendMail = function(a){
            console.log(a.toEmail);
            var mailJSON ={
                "key": "xxxxxxxxxxxxxxxxxxxxxxx",
                "message": {
                  "html": ""+a.mailBody,
                  "text": ""+a.mailBody,
                  "subject": ""+a.subject,
                  "from_email": "sender@sending.domain.com",
                  "from_name": "Support",
                  "to": [
                    {
                      "email": ""+a.toEmail,
                      "name": "John Doe",
                      "type": "to"
                    }
                  ],
                  "important": false,
                  "track_opens": null,
                  "track_clicks": null,
                  "auto_text": null,
                  "auto_html": null,
                  "inline_css": null,
                  "url_strip_qs": null,
                  "preserve_recipients": null,
                  "view_content_link": null,
                  "tracking_domain": null,
                  "signing_domain": null,
                  "return_path_domain": null
                },
                "async": false,
                "ip_pool": "Main Pool"
            };
            var apiURL = "https://mandrillapp.com/api/1.0/messages/send.json";
            $http.post(apiURL, mailJSON).
              success(function(data, status, headers, config) {
                alert('successful email send.');
                $scope.form={};
                console.log('successful email send.');
                console.log('status: ' + status);
                console.log('data: ' + data);
                console.log('headers: ' + headers);
                console.log('config: ' + config);
              }).error(function(data, status, headers, config) {
                console.log('error sending email.');
                console.log('status: ' + status);
              });
        }

        vm.getHarryPotter = function() {
            return {"title":"How Well Do You Know Harry Potter?","description":"How Well Do You Know 'Harry Potter'? Find out if you are a true Harry Potter fan by taking on this quiz.","imageUrl":"https:\/\/media.proprofs.com\/images\/QM\/user_images\/1758020\/qm3507246252.jpg","questions":["What are Voldemort's followers called?","How many broomsticks are flown in a full game of Quidditch?","What creature is depicted in the emblem for Gryffindor house?","The term \"Muggle\" refers to what kind of person?","Professor Dumbledore's spectacles are rectangular?","What colour is the Hogwarts Express?","How are parcels and letters sent in the wizarding world?","Who's birthday party did Harry, Ron, and Hermione go to in The Chamber of Secrets?","Who disguised himself as Mad Eye Moody in The Goblet of Fire?","What crime was Hagrid committed of in his time at Hogwarts?","What is Harry's youngest son's name?"],"answers":[["Death Eaters","The Devoted","Voldemorts Army","The Dark Ones"],["Eleven","Sixteen","Fifteen","Fourteen"],["An eagle","A lion","A badger","A snake"],["A magical person with only one magical parent","A magical person who is really bad at magic","A non-magical person from a magical family","A non-magical person from a non-magical family"],["True","False"],["Emerald","Indigo","Scarlet","Coal"],["Via Wizard postmen","Via the Floo network","Via Broomstick","Via Owls"],["Dobby","Draco Malfoy","Albus Dumbledore","Nearly Headless Nick"],["Earnie McMillian","Barty Crouch Jr.","Severus Snape","Vincent Crabbe"],["Casting a spell on professor","Killing a girl","Going into the forbidden forest","Opening the chamber of secrets"],["Sirius","Albus","James","Remus"]],"correctanswers":["Death Eaters","Fifteen","A lion","A non-magical person from a non-magical family","False","Scarlet","Via Owls","Nearly Headless Nick","Barty Crouch Jr.","Opening the chamber of secrets","Albus"],"personalityanswers":["I suck at Harry Potter","I haven't watched all Harry Potter movies yet.","I'm okay at Harry Potter","I'm really good at Harry Potter","Excellent! - I'm a Wizard"]}
        }

        vm.getDoesHeLikeYou = function() {
            return {"title":"Does He Like You?","description":"Does he like you? Find out whether he likes you or not by taking on this quiz.","imageUrl":"http:\/\/imquiz.co\/images\/does-he-like-you-quiz.png","questions":["If you look at him and he looks back, does he?","When talking to you does he?","Does he have a girlfriend?","Is he hot?","Do you have a lot in common?","Does he ever start conversations with you?","How much time do you spend with him?"],"answers":[["Pretend he doesn't see you","Look away quickly and embarrassed","Stare back with a loving smile"],["He doesn't talk to me","Talk's and act's normal","Act nervous, stutter"],["Yes","No","Maybe"],["Yes","No","Kind of"],["A little","Everything!","Total opposites"],["Always","Once in a while","No"],["Every second","None","Once a week"]],"correctanswers":["Look away quickly and embarrassed","Act nervous, stutter","No","Kind of","A little","Once in a while","Every second"],"personalityanswers":["No, he may or may not like you.","Yes, he likes you.","He loves you for sure!"]};
        }

        vm.getWillMarried = function() {
            return {"title":"Will You Ever Get Married?","description":"Will you ever find your true love? Curious? Take this quiz to find out.","imageUrl":"http:\/\/imquiz.co\/images\/willyouevergetmarried.jpg","questions":["Do you cry during movies?","What are your thoughts on 'Romeo and Juliet'?","Do you want to have kids?","What is your parents' relationship status?","How old are you?","How many times have you been in love?","Have you been on a date this past month?","Do you believe in the concept of soulmates?","True or false: I live well with others.","Are you religious?"],"answers":[["All the time","Every once in a while","Never"],["I'l never read it, TBH","It's the most tragic love story of all time","It's pretty pathetic"],["Absolutely","I'm not sure","No thanks"],["They are still married","They divorced \/ seperated","They have passed\/are widowed"],["12 or below","Teens","20s","30 +"],["Never","Once","More than once"],["Yes","No"],["I do","I dont"],["True","False"],["Absolutely","No, but i'm spiritual","Not at all"]],"correctanswers":["Every once in a while","It's pretty pathetic","Absolutely","They are still married","Teens","Once","Yes","I do","True","No, but i'm spiritual"],"personalityanswers":["No! It doesn't look like a lifetime commitment is in the cards for you. This isn't necessarily a bad thing. We're not all hard-wired to be with one person the rest of our lives.","Yes! Wedding bells are absolutely in your future. Whether or not you've already found your soulmate, the time will come when you're wiping tears, walking down the aisle, and eating cake. Congrats in advance!"]};
        }


        vm.buildQuestion = function() {

        }
    }

    TOSCtrl.$inject = ['$scope', '$location'];
    function TOSCtrl($scope, $location) {
        let vm = this;
        const DOMAIN = 'https://imquiz-001.firebaseapp.com';

        vm.domain = DOMAIN;
    }
})();
//https%3A%2F%2Fimquiz-001.firebaseapp.com%2F-LOTn7P0Tj45rNbInQXy-imQuiz
