(function(){
    angular
      .module('quizApp',['firebase'])
      .controller('LandingCtrl', LandingCtrl)

    LandingCtrl.$inject = ['$scope', '$location'];
    function LandingCtrl($scope, $location){
        let vm = this;
        const DOMAIN = 'https://imquiz-001.firebaseio.com';
        const HOSTED_DOMAIN = 'http://localhost:5000/';
        vm.shareLink = '';
        vm.mode = 'INIT';

        vm.init = function(){
            const userQuestionsId = $location.$$absUrl.split('/')[3];
            if (userQuestionsId) {
                const req =new Request(DOMAIN+'/user-answered-questions/'+userQuestionsId+'.json', {method:'GET'});
                fetch(req)
                    .then(response => {
                        response.json().then(data => {
                            console.log(data);
                            if (data) {
                                vm.mode = 'START_QUESSING';
                                vm.userQuestioners = data;
                                vm.orginUserQuestioners = angular.copy(data);
                                vm.userQuestioners.questions.map( subarray => {
                                    subarray.position = 'PENDING';
                                    subarray.options.map( item => delete item.selected );
                                });
                                vm.userQuestioners.questions[0]['position'] = 'CURRENT';
                                $scope.$apply();
                            }
                        })
                    });
            }

        }();

        vm.startAnswer = function(name) {
            if (name) {
                vm.mode = 'START_ANSWERING';

                vm.userQuestioners = {username:name , questions:
                    [
                        {desc:'what is me?', position: 'CURRENT', options: [
                            {id: 0, desc: 'hey'},
                            {id: 1, desc: 'Hi'},
                            {id: 2, desc: 'hey'},
                            {id: 3, desc: 'Hu'},
                        ]},
                        {desc:'second questions?', position: 'PENDING', options: [
                            {id: 0, desc: 'hey'},
                            {id: 1, desc: 'Hi'},
                            {id: 2, desc: 'hey'},
                            {id: 3, desc: 'Hu'},
                        ]},
                    ]
                };
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
            vm.userQuestioners.questions.forEach((question, i) => {
                if (question.position == 'PENDING') {
                    question.position = 'CURRENT';
                    return;
                } else if (i == vm.userQuestioners.questions.length -1 && question.position != 'PENDING') {
                    isCompleted = true;
                }
            });
            if (isCompleted) {
                if (vm.mode == 'START_ANSWERING') {
                    vm.mode = 'DONE_ANSWERING';
                    vm.noAnswered = vm.getAnsweredQuestions();
                    vm.submit();
                } else if (vm.mode == 'START_QUESSING') {
                    vm.compute();
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
            const ref = firebase.database().ref();
            const questionRef = ref.child('user-answered-questions');
            const formData = vm.userQuestioners;
            const answeredData = vm.userQuestioners.questions.filter(item => item.answered);
            formData.questions = answeredData;
            const data = angular.copy(formData);
            console.log(data);
            // questionRef.push(data).then((snap) => {
            //     const key = snap.key
            //     vm.shareLink = HOSTED_DOMAIN+key;
            //     $scope.$apply();
            // });
        };

        vm.compute = function(){
           let count = 0;
           vm.orginUserQuestioners.questions.forEach((orgItem, i) => {
                const item = vm.userQuestioners.questions[i];
                const options = item.options;
                const origOption = orgItem.options;

                const userOptid =  options.filter(opt => opt.selected);
                const origOptid =  origOption.filter(opt => opt.selected);

                (userOptid[0].id == origOptid[0].id) ? count+=1 :'';

           });
           console.log(count);
        };
    }
})();
