(function(){
    angular
      .module('quizApp',['firebase'])
      .controller('LandingCtrl', LandingCtrl)

    LandingCtrl.$inject = ['$scope', '$location'];
    function LandingCtrl($scope, $location){
        let vm = this;
        const DOMAIN = 'https://imquiz-001.firebaseio.com';
        const HOSTED_DOMAIN = 'https://imquiz-001.firebaseapp.com/';
        const ref = firebase.database().ref();
        const questionRef = ref.child('user-answered-questions');
        vm.display = {};
        vm.shareLink = '';
        vm.mode = 'START_ANSWERING';

        vm.init = function(){
            vm.userQuestionsId = $location.$$absUrl.split('/')[3];
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
                vm.shareLink = HOSTED_DOMAIN+key;
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
            $scope.fbShareLink = $location.$$absUrl;
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
        }

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
    }
})();
//https%3A%2F%2Fimquiz-001.firebaseapp.com%2F-LOTn7P0Tj45rNbInQXy-imQuiz
