(function(){
    angular
      .module('quizApp',['firebase'])
      .controller('LandingCtrl', LandingCtrl)

    LandingCtrl.$inject = ['$scope'];
    function LandingCtrl($scope){
        let vm = this;
        vm.mode = 'INIT';
        vm.userQuestioners = {username:'' , questions:
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
        }

        vm.init = function(){
            vm.mode = 'INIT';
        };

        vm.startAnswer = function(name) {
            if (name) {
                vm.mode = 'START_ANSWERING';
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
                vm.mode = 'DONE_ANSWERING';
                vm.noAnswered = vm.getAnsweredQuestions();
                vm.submit();
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
            const answeredData = vm.userQuestioners.questions.filter(item => item.answered);
            const data = angular.copy(answeredData);
            console.log(data);
            // questionRef.push(data);
        };
    }
})();