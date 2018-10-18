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
        // const HOSTED_DOMAIN = 'https://imquiz-001.firebaseapp.com/';
        const HOSTED_DOMAIN = $location.protocol()+'://'+$location.host()+'/';
        const HOME_PAGE = HOSTED_DOMAIN + 'home/';
        const ref = firebase.database().ref();
        const questionRef = ref.child('user-answered-questions');
        vm.display = {};
        vm.userQuestioners = {};
        vm.shareLink = '';
        vm.mode = 'START_ANSWERING';
        vm.domain = HOSTED_DOMAIN;
        console.log(HOSTED_DOMAIN);

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

        vm.play = function () {
            $state.go($state.current, {}, {reload: true});
        };

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
                } else if (vm.mode == 'START_GUESSING' || vm.mode == 'START_DEFINED') {
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

            if (vm.userQuestioners.isTemp) {
                const obj = vm.userQuestioners.result.filter(result => vm.knowPercentage <= result.percentage);
                vm.userQuestioners.definedResult = obj[0]
                vm.userQuestioners.definedResult.show = true;
                vm.display.loading = false;
                vm.display.loaded = true;
                return;
            };

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

        vm.getHarryPotter = function() {
            return {"isTemp": true, "title":"How Well Do You Know Harry Potter?","description":"How Well Do You Know 'Harry Potter'? Find out if you are a true Harry Potter fan by taking on this quiz.","imageUrl":"data:image/jpeg;base64,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","questions":["What are Voldemort's followers called?","How many broomsticks are flown in a full game of Quidditch?","What creature is depicted in the emblem for Gryffindor house?","The term \"Muggle\" refers to what kind of person?","Professor Dumbledore's spectacles are rectangular?","What colour is the Hogwarts Express?","How are parcels and letters sent in the wizarding world?","Who's birthday party did Harry, Ron, and Hermione go to in The Chamber of Secrets?","Who disguised himself as Mad Eye Moody in The Goblet of Fire?","What crime was Hagrid committed of in his time at Hogwarts?","What is Harry's youngest son's name?"],"answers":[["Death Eaters","The Devoted","Voldemorts Army","The Dark Ones"],["Eleven","Sixteen","Fifteen","Fourteen"],["An eagle","A lion","A badger","A snake"],["A magical person with only one magical parent","A magical person who is really bad at magic","A non-magical person from a magical family","A non-magical person from a non-magical family"],["True","true"],["Emerald","Indigo","Scarlet","Coal"],["Via Wizard postmen","Via the Floo network","Via Broomstick","Via Owls"],["Dobby","Draco Malfoy","Albus Dumbledore","Nearly Headless Nick"],["Earnie McMillian","Barty Crouch Jr.","Severus Snape","Vincent Crabbe"],["Casting a spell on professor","Killing a girl","Going into the forbidden forest","Opening the chamber of secrets"],["Sirius","Albus","James","Remus"]],"correctanswers":["Death Eaters","Fifteen","A lion","A non-magical person from a non-magical family","true","Scarlet","Via Owls","Nearly Headless Nick","Barty Crouch Jr.","Opening the chamber of secrets","Albus"],"personalityanswers":["I suck at Harry Potter","I haven't watched all Harry Potter movies yet.","I'm okay at Harry Potter","I'm really good at Harry Potter","Excellent! - I'm a Wizard"]}
        }

        vm.getDoesHeLikeYou = function() {
            return {"isTemp": true, "title":"Does He Like You?","description":"Does he like you? Find out whether he likes you or not by taking on this quiz.","imageUrl":"http:\/\/imquiz.co\/images\/does-he-like-you-quiz.png","questions":["If you look at him and he looks back, does he?","When talking to you does he?","Does he have a girlfriend?","Is he hot?","Do you have a lot in common?","Does he ever start conversations with you?","How much time do you spend with him?"],"answers":[["Pretend he doesn't see you","Look away quickly and embarrassed","Stare back with a loving smile"],["He doesn't talk to me","Talk's and act's normal","Act nervous, stutter"],["Yes","No","Maybe"],["Yes","No","Kind of"],["A little","Everything!","Total opposites"],["Always","Once in a while","No"],["Every second","None","Once a week"]],"correctanswers":["Look away quickly and embarrassed","Act nervous, stutter","No","Kind of","A little","Once in a while","Every second"],"personalityanswers":["No, he may or may not like you.","Yes, he likes you.","He loves you for sure!"]};
        }

        vm.getWillMarried = function() {
            return {"isTemp": true, "title":"Will You Ever Get Married?","description":"Will you ever find your true love? Curious? Take this quiz to find out.","imageUrl":"http:\/\/imquiz.co\/images\/willyouevergetmarried.jpg","questions":["Do you cry during movies?","What are your thoughts on 'Romeo and Juliet'?","Do you want to have kids?","What is your parents' relationship status?","How old are you?","How many times have you been in love?","Have you been on a date this past month?","Do you believe in the concept of soulmates?","True or false: I live well with others.","Are you religious?"],"answers":[["All the time","Every once in a while","Never"],["I'l never read it, TBH","It's the most tragic love story of all time","It's pretty pathetic"],["Absolutely","I'm not sure","No thanks"],["They are still married","They divorced \/ seperated","They have passed\/are widowed"],["12 or below","Teens","20s","30 +"],["Never","Once","More than once"],["Yes","No"],["I do","I dont"],["True","False"],["Absolutely","No, but i'm spiritual","Not at all"]],"correctanswers":["Every once in a while","It's pretty pathetic","Absolutely","They are still married","Teens","Once","Yes","I do","True","No, but i'm spiritual"],"personalityanswers":["No! It doesn't look like a lifetime commitment is in the cards for you. This isn't necessarily a bad thing. We're not all hard-wired to be with one person the rest of our lives.","Yes! Wedding bells are absolutely in your future. Whether or not you've already found your soulmate, the time will come when you're wiping tears, walking down the aisle, and eating cake. Congrats in advance!"]};
        }


        vm.buildQuestion = function(data) {
            const formCopy = angular.copy(data);
            const formData = {};
            formData.questions = [];
            formData.title = formCopy.title;
            formData.imageUrl = formCopy.imageUrl;
            formData.description = formCopy.description;
            formData.isTemp = formCopy.isTemp;
            formData.result = [];

            const percentagePerAns = parseInt (100/(formCopy.personalityanswers.length));
            let currentPerc = 0;
            angular.forEach(formCopy.personalityanswers, (item, i) =>{
                const data = {
                    desc: item,
                    percentage: percentagePerAns + currentPerc,
                }

                if (formCopy.personalityanswers.length-1 == i) data.percentage = 100;
                currentPerc += percentagePerAns;
                formData.result.push(data);

            });

            angular.forEach(formCopy.questions, (item, i) => {
                let data = {}

                data.desc = item;
                data.options = [];
                angular.forEach(formCopy.answers[i], (ans, ansId)=> {
                    const ansData = {
                        desc: ans,
                        id: ansId+1,
                    };

                    if (formCopy.correctanswers[i] == ans) ansData.selected = true
                    data.options.push(ansData);
                });
                data.position = "HIDE";
                formData.questions.push(data);
            })
            return formData;
        }

        vm.showDefineQuiz = function(data) {
            data.definedResult = {}
            vm.showQuestions = true;
            vm.mode = "START_DEFINED";
            vm.userQuestioners = {};
            vm.userQuestioners = data;
            vm.orginUserQuestioners = angular.copy(data);
            vm.userQuestioners.questions.map( subarray => {
                subarray.position = 'PENDING';
                subarray.options.map( item => delete item.selected );
            });
            vm.userQuestioners.username = '';
            vm.userQuestioners.questions[0]['position'] = 'CURRENT';
            window.scrollTo(0, 0);
            console.log(vm.userQuestioners);
        };

        vm.predefinedQuiz = function() {
            vm.definedQuiz = [];
            vm.definedQuiz.push(vm.buildQuestion(vm.getHarryPotter()));
            vm.definedQuiz.push(vm.buildQuestion(vm.getWillMarried()));
            vm.definedQuiz.push(vm.buildQuestion(vm.getDoesHeLikeYou()));
            console.log(vm.definedQuiz);
        }();

    }

    TOSCtrl.$inject = ['$scope', '$location'];
    function TOSCtrl($scope, $location) {
        let vm = this;
        const DOMAIN = 'https://imquiz-001.firebaseapp.com';

        vm.domain = DOMAIN;
    }
})();
//https%3A%2F%2Fimquiz-001.firebaseapp.com%2F-LOTn7P0Tj45rNbInQXy-imQuiz
