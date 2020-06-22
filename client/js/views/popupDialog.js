/*
    Copyright (c) 2016 Toshiba
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0


    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
define(['js/app','ctrl/COMMON',
        'text!templates/popup_clone_dlg.html',
        'text!templates/popup_tag_dlg.html',
        'text!templates/popup_timer_dlg.html',
        'text!templates/popup_share_dlg.html',
        'text!templates/popup_ctrl_dlg.html',
        'text!templates/popup_capture_dlg.html',
        'util/dialog/bsdialog'],
     function(app,COMMON, cloneTpl, tagTpl, timerTpl, shareTpl, ctrlTpl, captureTpl, BootstrapDialog) {
  
  var MyClass = function() {};
  
  MyClass.prototype.tagScreen = function(sharable_users, current_screenid, current_dataid) {
    var self = this,
        now= new Date(),
        stime_current = [
            '-',
            now.getFullYear().toString().substr(-2),
            ("0" + (now.getMonth() + 1)).slice(-2),
            ("0" + now.getDate()).slice(-2),
            '-',
            ("0" + now.getHours()).slice(-2),
            ("0" + now.getMinutes()).slice(-2),
            ("0" + now.getSeconds()).slice(-2)
          ].join(''),
        default_tag_name = current_screenid + stime_current;

    var deferred = $.Deferred();

    BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
       title: 'Tagging SCREEN: ' + current_screenid,
       message: _.template(tagTpl)(),
       onshow: function(dialog) {
         var $body = dialog.getModalBody(), 
             $nameElement = $body.find("input[name='tagname']"),
             $shareCheckbox = $body.find("input[name='sharescreen'][type='checkbox']"),
             $chkgrp = $body.find('div[name=chkgrp]'),
             $reflink = $body.find("#extra_link");

         var host = window.location.protocol + '//'+ window.location.host,
             link = host  + '?data=' + current_dataid + '&sid='+ default_tag_name ;
        
         //set default unchecked
         $shareCheckbox.prop('checked', false); // Unchecks it
         $chkgrp.hide();

         $shareCheckbox.change(function() {
          if ($(this).is(':checked')) {
            $chkgrp.show();
            //show all users with checkbox group
          } else {
            $chkgrp.hide();
          }
         });
        
         //add checkboxes
         $chkgrp.append("<input type='checkbox' value='*' /><label>ALL(*) </label>");
         sharable_users.forEach(function(user) {
           $chkgrp.append("<input type='checkbox' value='" + user + "' /><label>" + user + " </label>");
         });

         $reflink.attr("href", link).text(link);
         $nameElement.val(default_tag_name);
         $nameElement.on('keyup', function(e) {
           link = host + '?data=' + current_dataid + '&sid=' + $nameElement.val(); 
           $reflink.attr("href", link).text(link);
         });
       },
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var user = app.session.user.get('id'),
              $body = dialog.getModalBody(), 
              $nameElement = $body.find("input[name='tagname']"),
              $shiftCheckbox = $body.find("input[name='shiftscreen'][type='checkbox']"),
              $shareCheckbox = $body.find("input[name='sharescreen'][type='checkbox']"),
              $chkgrp = $body.find('div[name=chkgrp]'),
              $errElement = $body.find("label[name='errorMessage']"),
              inputTagID = $nameElement.val(),
              shift = $shiftCheckbox.prop('checked');
            if(_.isEmpty(inputTagID)) {
               $nameElement.focus();
               $nameElement.select();
            } else {
              var imgurl = (user+'.'+ inputTagID).replace(/\/|\\/g, '_'),
                  data = {  user:  user,
                            id: current_screenid,
                            cloneid: inputTagID,
                            tag: 1,
                            imgurl: imgurl
                          };
              $.ajax({  url: '/api/screen/ctrl/clone', 
                        type: 'POST',  
                        data: data 
                }).done(function(data, textStatus, jqXHR) { //success to save object to server
                  
                  $chkgrp.find('input[type=checkbox]').each(function () {
                    if (this.checked) {
                      self.setSharedUser(data.id, $(this).val(), 1);
                    }
                  });
                  deferred.resolve({screenid: data.id, shift: shift, imgurl: imgurl});
                  dialog.close();
                }).fail(function(jqXHR, textStatus, errorThrown) {
                        if($errElement.length) { //no this element?
                          $errElement.text(jqXHR.responseText);
                        }
                        setTimeout(function() {
                          $errElement.text('');
                        }, 3000);
                        $nameElement.focus();
                        $nameElement.select();
                    });
             } //else end
          } //action end
         }, //OK button end
         {
           label: 'CANCEL',
           action: function(dialog) {
             deferred.reject();
             dialog.close();
           }
         }
       ]
     });

     return deferred.promise();
  }

  //open dialog for inputing screeId and description
  //set screeId as current data and description is null
  MyClass.prototype.cloneScreen = function (current_screenid) {
     
     var self = this,
         newid = current_screenid +'_clone';

     var deferred = $.Deferred();

     BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
      
       title: 'Clone the current SCREEN',
       message: _.template(cloneTpl)({id: newid}),
       draggable: true,
       onshow: function(dialog) {
          var nameElement = dialog.getModalBody().find("input[name='name']");
          nameElement.focus();
          nameElement.select();
       },
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var $body = dialog.getModalBody(), 
                 $nameElement = $body.find("input[name='name']"),
                 $errElement = $body.find("label[name='errorMessage']"),
                 $shiftElement = $body.find("input[type='checkbox']"), 
                 inputedid = $nameElement.val(),
                 shift = $shiftElement.prop('checked');
             if(_.isEmpty(inputedid)) {
               $nameElement.focus();
               $nameElement.select();
             } else {
               var data = { user: app.session.user.get('id'),
                            id: current_screenid,
                            cloneid: inputedid,
                            tag: 0
                          };
               $.ajax({ url: '/api/screen/ctrl/clone', 
                        type: 'POST',  
                        data: data })
                  .done(function(data, textStatus, jqXHR) { //success to save object to server
                        deferred.resolve({screenid: data.id, shift: shift});
                        dialog.close();
                    })
                  .fail(function(jqXHR, textStatus, errorThrown) {
                        //deferred.reject();
                        //if fail, show warning message
                        if($errElement.length) {
                          $errElement.text(jqXHR.responseText);
                        }
                        setTimeout(function() {
                          $errElement.text('');
                        }, 3000);
                        $nameElement.focus();
                        $nameElement.select();
                    });
             }//else end
           } //action end
         }, //OK button end
         {
           label: 'CANCEL',
           //cssClass: 'btn-primary',
           action: function(dialog) {
             deferred.reject();
             dialog.close();
           }
         }
       ]
     });
      
     return deferred.promise();
   };

   MyClass.prototype.timerSetup = function(dataManager) {
    BootstrapDialog.show({
       title: 'Timer setup',
       message: _.template(timerTpl)(),
       onshow: function(dialog) {
         var attrs = dataManager.getTimer();
         if(attrs._timeout_) {
           dialog.getModalBody().find("select[name='timeout']").val(attrs._timeout_);
         }
         if(attrs._interval_) {
           dialog.getModalBody().find("select[name='interval']").val(attrs._interval_);
         }
       },
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var newTimout = +dialog.getModalBody().find("select[name='timeout'] option:selected").val(),
                 newInterval = +dialog.getModalBody().find("select[name='interval'] option:selected").val();
             dataManager.setTimer({'_timeout_': newTimout, '_interval_': newInterval});
             dialog.close();
           } //action end
         }, //OK button end
         {
           label: 'CANCEL',
           action: function(dialog) {
             dialog.close();
           }
         }
       ]
     });
  }
 
  MyClass.prototype.updateSharedScreen = function(screenid, $chkgrp) {
    var self = this,

        ajaxOptions = { //get current sharable statuses
         url: '/api/scrauth/users',
         type: 'GET',
         dataType: "json",
         timeout: 10000, //ms
         data: {screenId: screenid },
       };

    $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {

          data.users.forEach(function(user) { //update current sharable statuses
            $chkgrp.find("input[type='checkbox'][value='" + user.userId + "']").prop("checked", true);
          });
          //
        })
       .fail(function(jqXHR, textStatus, errorThrown) {
          console.error(errorThrown);
       });
  };
  
  MyClass.prototype.setSharedUser = function(screenid, userid, shareFlag) {
      var ajaxOptions = {
         url: '/api/scrauth/user',
         type: 'POST',
         dataType: "json",
         timeout: 10000, //ms
         data: {screenId: screenid, user:{ userId: userid, shareFlag: shareFlag } },
       };
       $.ajax(ajaxOptions)
       .done(function(data, textStatus, jqXHR) {
          //
        })
       .fail(function(jqXHR, textStatus, errorThrown) {
          console.error(errorThrown);
       });
  };
  
  MyClass.prototype.updateReferenceScreen = function (screenid, $checkbox, $all_users_checkbox) {   
    var self=this, isDefaultScreen = false;
    if(isDefaultScreen = $checkbox.prop('checked')) { //change ref screen 
      var isToChange = confirm("Are you want to change default SCREEN to "+ screenid + '?' );
      if (!isToChange) {
        $checkbox.prop('checked', false);
        return;
      }
    } else { //delete ref screen
      var isToDelete = confirm(" Are you want to change default SCREEN !!!" );
      if(!isToDelete ) {
        $checkbox.prop('checked', true);
        return;
      }
    }

    //disable ALL(*) operation since the screen will be shared to ALL
    if(isDefaultScreen) {

      //if change to default, then share to all
      self.setSharedUser(screenid, '*', 1);
      $all_users_checkbox.prop('checked', true);
      
      $all_users_checkbox.prop('disabled', true);
    } else {
      //if delete default, then keep sharing unchanged
      $all_users_checkbox.prop('disabled', false);
    }

    var ajaxOptions = {
      url: '/api/screen/ctrl/ref',
      type: 'POST',
      dataType: "json",
      timeout: 10000, //ms
      data: {user: app.session.user.get('id'), screenId: screenid, isDefault: (isDefaultScreen)?1:0 },
    };
    $.ajax(ajaxOptions)
      .done(function(data, textStatus, jqXHR) {
        //skip
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        //skip
      });
  };

  MyClass.prototype.getReferenceScreen = function () {
    var deferred = $.Deferred();
    var ajaxOptions = {
       url: '/api/screen/ctrl/ref',
       type: 'GET',
       dataType: "json",
       timeout: 10000, //ms
       data: {user: app.session.user.get('id') },
     };
     $.ajax(ajaxOptions)
     .done(function(data, textStatus, jqXHR) {
         deferred.resolve(data.screenId);
       })
     .fail(function(jqXHR, textStatus, errorThrown) {
        deferred.reject(errorThrown);
     });
    return deferred.promise();
 };

  MyClass.prototype.shareScreen = function(sharable_users, screenid, referencial_permitable) {
    var self=this;
    
    BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
       title: 'Share SCREEN',
       message: _.template(shareTpl)(),
       onshow: function(dialog) {
        var $body = dialog.getModalBody(),
            $screen_name = $body.find('label[name=screen]'),
            $ref_screen_checkbox = $body.find("input[name='refscreen']"),
            $chkgrp = $body.find('div[name=chkgrp]');
        //set the screen name!
        $screen_name.text('Share SCREEN ' + screenid + ' to user: ');

        //add checkboxes for user checkboxs
        var $all_users_checkbox = $("<input type='checkbox' value='*' /><label>ALL(*) </label>");
        
        $all_users_checkbox.appendTo($chkgrp);
        sharable_users.forEach(function(user) {
          $("<input type='checkbox' value='" + user + "' /><label>" + user + " </label>").appendTo($chkgrp);
        });

        //add actions for user checkboxs
        $chkgrp.find('input[type=checkbox]').on("click", function (ev) {
          self.setSharedUser(screenid, $(this).val(), ($(this).is(':checked'))? 1: 0);
        });
        
        //set the current actual authority values
        self.updateSharedScreen(screenid, $chkgrp);

        //show Default Screen setup
        if(referencial_permitable) {    
          //show
          $ref_screen_checkbox.parent().show();
          self.getReferenceScreen().done( function(old_ref_screenid) {
            //set initial DEFAULT screen setup
            if(old_ref_screenid && screenid == old_ref_screenid) { 
              $ref_screen_checkbox.prop('checked', true);
              $all_users_checkbox.prop('disabled', true);
            } else {
              $ref_screen_checkbox.prop('checked', false);
              $all_users_checkbox.prop('disabled', false);
            }
          }).fail(function() { 
            //unknown error--so donot change refence screen!
            $ref_screen_checkbox.parent().hide();
          });

          //update
          $ref_screen_checkbox.change(function() {
            self.updateReferenceScreen(screenid, $ref_screen_checkbox, $all_users_checkbox);
          });
        } else {
          //hide DEFAULT screen setup
          $ref_screen_checkbox.parent().hide();
        }

        
       },
       draggable: true,
       buttons: [
         {
           label: 'CLOSE',
           action: function(dialog) {
             dialog.close();
           }
         }
       ]
     });
     
  };

  MyClass.prototype.captureScreenSetup = function(filename) {
    var self=this,  deferred = $.Deferred();
    
    BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
      
       title: 'Capture SCREEN',
       message: _.template(captureTpl)(),
       onshow: function(dialog) {
        var body = dialog.getModalBody(),
            $fileLabel =  body.find('label[for=fileName]'),
            $fileName= body.find('input[name=saveFileName]'),
            $toSaveLocal = body.find('input[name=saveLocation]');
        $fileName.val(filename);
        $toSaveLocal.on("click", function (ev) {
          var $target = $(this),
              toSaveLocal = $target.val() ==='local';
          if(!toSaveLocal) {
            //$fileName.prop('disabled', true);
            $fileLabel.hide();
          } else {
            //$fileName.prop('disabled', false);
            $fileLabel.show();
          }
        });
       },
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
              var body = dialog.getModalBody(),
                  fileName= body.find('input[name=saveFileName]').val(),
                  toSaveLocal = (body.find('input[name=saveLocation]:checked').val() ==='local') ;
              
              if(!toSaveLocal  || (toSaveLocal && fileName.length>0) ) {
                deferred.resolve({ toSaveLocal: toSaveLocal, fileName: fileName});
                dialog.close();
              }
           }
         },
         {
           label: 'CLOSE',
           action: function(dialog) {
             dialog.close();
             deferred.reject(null);
           }
         }
       ]
     });
     
     return deferred.promise();
  };

   //create new screen dialog
   MyClass.prototype.createNewScreen = function (/*url, */default_width, default_height) {
     var self = this;
     var deferred = $.Deferred();
     BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
      
       title: 'Create a new SCREEN',
       message: _.template(ctrlTpl)( { id: '', kind_of_dlg: 1}),
       onshow: function(dialog) {
         var body = dialog.getModalBody().css('line-height',1),
             nameElement = body.find("input[name='name']");
         body.find("input[name='width']").val(default_width? default_width:'');
         body.find("input[name='height']").val(default_height? default_height:'');
         nameElement.focus();
       },
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var $body =  dialog.getModalBody(),
                 idInputed =$body.find("input[name='name']").val(),//should check the input is not empty
                 description = $body.find("textarea[name='description']").val(),
                 maxColumns =$body.find("select[name='maxColumns'] option:selected").val(),
                 maxRows = $body.find("select[name='maxRows'] option:selected").val(),
                 width = $body.find("input[name='width']").val(),
                 height = $body.find("input[name='height']").val(),
                 margin = $body.find("select[name='margin'] option:selected").val();
             var ajaxOptions = {
               url: '/api/screen/ctrl/new',
               type: 'POST',
               dataType: "json",
               data: { user: app.session.user.get('id'),
                       id: idInputed,
                       description: description,
                       maxColumns: +maxColumns,
                       maxRows: +maxRows,
                       margin: +margin,
                       width: +width,
                       height: +height
                }
             };
             $.ajax(ajaxOptions)
                .done( function (data, textStatus, jqXHR) {
                      dialog.close();
                      deferred.resolve(data.id);
                  })
                 .fail(function(jqXHR, textStatus, errorThrown) {
                    dialog.getModalBody().find('#errorMessage').text(jqXHR.responseText);
                       setTimeout(function() {
                         dialog.getModalBody().find('#errorMessage').text("");
                       }, 3000);
                     idElement.focus();
                     idElement.select();
                  });
           } //action end
         }, //OK button end
         {
           label: 'CANCEL',
           action: function(dialog) {
             dialog.close();
             deferred.reject(null);
           }
         }
       ]
     });
     return deferred.promise();
   };
   
   MyClass.prototype.customizeScreen = function (model, default_width, default_height) {
     var self = this;
     var deferred = $.Deferred();
     BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
       title: 'Screen Customization',
       message: _.template(ctrlTpl)( { id: model.id, kind_of_dlg: 10}),
       onshow: function(dialog) {
         var body = dialog.getModalBody().css('line-height',1);
         var width = +model.get('width');
         var height = +model.get('height');
         var timeout = +model.get('timeout');
         var interval = +model.get('interval');
         body.find("input[name='width']").val((width)? width : default_width );
         body.find("input[name='height']").val((height)? height: default_height);
         body.find("select[name='timeout']").val((timeout)? timeout: 0);
         body.find("select[name='interval']").val( (interval)? interval: 0);
         body.find("select[name='maxColumns']").val(model.get('maxColumns'));
         body.find("select[name='maxRows']").val(model.get('maxRows'));
         body.find("select[name='margin']").val(model.get('margin'));
         body.find("textarea[name='description']").val(model.get('description'));
       },
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var body = dialog.getModalBody();
             var width = +body.find("input[name='width']").val(),
                 height = +body.find("input[name='height']").val(),
                 timeout = +body.find("select[name='timeout'] option:selected").val(),
                 interval = +body.find("select[name='interval'] option:selected").val();
                 maxColumns = +body.find("select[name='maxColumns'] option:selected").val(),
                 maxRows = +body.find("select[name='maxRows'] option:selected").val(),
                 margin = +body.find("select[name='margin'] option:selected").val(),
                 description =  body.find("textarea[name='description']").val(),
                 
             deferred.resolve({
                width:width,
                height: height, 
                maxRows:maxRows, 
                maxColumns:maxColumns,
                margin: margin,
                timeout:timeout,
                interval:interval,
                description: description 
             });
             dialog.close();
           } //action end
         }, //OK button end
         {
           label: 'CANCEL',
           action: function(dialog) {
             dialog.close();
             deferred.reject('Cancel screen setup.');
           }
         }
       ]
     });
     return deferred.promise();
  };


  //save tool dialog
  MyClass.prototype.execSaveTool = function (initialID) {
     var self = this;
     var deferred = $.Deferred();
    
     BootstrapDialog.show({
       closeByBackdrop: false,
       closeByKeyboard: false,
      
       title: 'Save the current TOOL',
       message: _.template(ctrlTpl)({id: initialID, kind_of_dlg: 0 }),
       draggable: true,
       buttons: [
         {
           label: 'OK ',
           action: function(dialog) {
             var $nameElement = dialog.getModalBody().find("input[name='name']");
             var inputedid = $nameElement.val(),
                 description = dialog.getModalBody().find('textarea').val();
                 
             if( !inputedid ) {
               $nameElement.focus();
               $nameElement.select();
             } else {
                deferred.resolve({
                  id: inputedid,//
                  description: description,//
                });
                dialog.close();
             }
           }
         }, //OK button end
         {
           label: 'CANCEL',
           //cssClass: 'btn-primary',
           action: function(dialog) {
             deferred.reject();
             dialog.close();
           }
         }
       ]
     });
     
     return deferred.promise();
    };


  return new MyClass();
});
