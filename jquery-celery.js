/*
    A simple jquery plugin which performs annoying celery task check for you
    
    Author: Davide Callegari - http://www.brokenseal.it/
    Home page: http://github.com/brokenseal/jquery-confirm-dialog/
    
    License: MIT
    
    Receiving data is expected to have this format:
    {
        'id': task_id,                              // the task id
        'status': status,                           // the status
        'result': result,                           // the result of the task, if any
        'description': task.description,            // a description to write as a message on the task container
        'return': task.instance.get_absolute_url(), // the return url displayed at the end of the task
        'success_text': success_text,               // if the task is successful, show this message
        'exception': response.__class__,            // exceptions raised, if any
        'traceback': traceback                      // traceback error, if any
    }
*/

;(function($){
    var
        UNREADY_STATES= {
            'PENDING': 1
            ,'RECEIVED': 1
            ,'RETRY': 1
            ,'STARTED': 1
        }
        ,EXCEPTION_STATES= {
            'FAILURE': 1
            ,'RETRY': 1
            ,'REVOKED': 1
        }
        ,container
        ,updateTask= function(options, task, taskElement, callback){
            var
                intervalId
                ,url= options.url.replace('%s', task.task_id)
                ,successLink
            ;
            
            // start to poll the url
            intervalId= setInterval(function(){
                $.ajax({
                    url: url
                    ,success: function(data, status, xhr){
                        
                        if(!(data.status in UNREADY_STATES)) {
                            clearInterval(intervalId);
                            
                            if(data.status in EXCEPTION_STATES) {
                                taskElement.addClass(options.errorClass);
                            } else {
                                successLink= '<a href="' + data['return'] + '">' + task.success_text + '</a>'
                                taskElement.addClass(options.successClass).html(successLink);
                            }
                            
                            if(callback) {
                                callback(options, data, status, xhr);
                            }
                        }
                    }
                    ,error: function(xhr, status, e){
                        //clearInterval(intervalId);
                        
                        taskElement.addClass(options.ajaxErrorClass);
                    }
                });
            }, options.timeout * 1000);
            
        }
    ;
    
    // the main plugin function
    $.celery= function(options, callback){
        var
            taskElement
            ,taskElementToClone
            ,task
            ,tasksLen
            ,i
        ;
        
        // merge provided options with default options
        options= $.extend($.celery.defaultOptions, options);
        
        if(options.url === undefined) {
            throw new Error("You must define the url from which to fetch the tasks data.");
        }
        
        if(options.tasks === undefined) {
            throw new Error("You must pass the tasks to the plugin in order to make it work.");
        }
        
        // init the tasks container
        if(!container) {
            container= $('#celery-tasks');
            
            if(!container.length) {
                container= $(options.containerTemplate);
                container[options.method](options.targetElement);
            }
        }
        
        // it's faster to clone than it is to create
        taskElementToClone= $(options.taskTemplate);
        
        for(i= 0, tasksLen= options.tasks.length; i< tasksLen; i++) {
            task= options.tasks[i];
            
            // search for the element associated with this task
            taskElement= $('#' + task.task_id, container);
            
            // if none are found
            if(!taskElement.length) {
                
                // create the element for this task and fill it with the given description
                taskElement= taskElementToClone.clone().text(task.description).attr('id', task.task_id);
                
                // append it
                container.append(taskElement);
            }
            
            // and let it be updated from this utility function
            updateTask(options, task, taskElement, callback);
        }
    };
    
    $.celery.defaultOptions= {
        targetElement: 'body'
        ,method: 'appendTo'
        ,containerTemplate: '<ul id="celery-tasks"></ul>'
        ,taskTemplate: '<li class="ui-celery-task"></li>'
        ,successClass: 'ui-celery-success'
        ,errorClass: 'ui-celery-error'
        ,ajaxErrorClass: 'ui-celery-ajax-error'
        ,timeout: 2
    };
})(jQuery);