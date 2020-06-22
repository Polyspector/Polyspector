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
define([ "js/app",
         'text!templates/data_list.html',
         'model/DatalistGroupModel',
         'd3',
         '/assets/libs/jquery-contextmenu/dist/jquery.contextMenu.min.js',
         '/assets/libs/d3-context-menu/js/d3-context-menu.js',
         'css!/assets/libs/d3-context-menu/css/d3-context-menu.css'
       ], function (app, myTpl, DataListGroupModel, d3, ContextMenu, d3_ContextMenu) {

  var MyClass = Backbone.View.extend({
    template: _.template(myTpl),
    initialize: function (options) {
      _.bindAll(this, 'render');
      var self = this;
      this.$el.html( this.template());
      this.user = app.session.user.get('id');
      var data = { user: this.user };
      if(this.model.get('tool')) {
        $.extend(data, {format: this.model.get('tool').format });
      }
      $.ajax({ //query databases worker
        url: app.API + '/data/datalist',
        type: 'POST', //or GET if no options' data
        dataType: "json",
        timeout: 30000, //10s
        data: data
      })
      .done(function(response, textStatus, jqXHR) {
          self.render(response);
         })
      .fail(function(jqXHR, textStatus, errorThrown) {
          console.log(errorThrown);
          window.alert( "データリスト取得にエラーが発生しました! " + errorThrown  ) ;
        });
      this.model = new DataListGroupModel();
    },
    // Events
    events: {
      "click button.grouping": 'registerGroup'
    },
    // Render FooterView
    render: function (response) {
      var self = this;
      this.model.fetch(
      {
        data: {user: app.session.user.get('id')},
        success: function (model, response2, options){
           group = response2.data;
           drawDataList(response, group);
        },
        error: function(model, xhr, options) {
          console.log(xhr.responseText);
        }
      });
      return this;

      function drawDataList(response, group) {
        var groupData;
        if(response && response.format.toLowerCase() ==="json" && response.filled) {
           self.rectHeight = 20;
           appendForm();
           self.dlist = (response.filled.list)? response.filled.list : response.filled;
           self.prepareContextMenu();
           self.draw("top")
        }
      }
      function appendForm() {
        $div = self.$el.find('#div_head_table');
        $div.append("<input class='grouping' type=\"text\" value=\"\">"+"</input>");
        $div.append("<button class='grouping' type=\"button\">"+ "NEW GROUP" +"</button>");
      }
    },
    //Context menu for deleting group and data
    prepareContextMenu: function() {
      var self = this;
      self.menu = [
        {
          title: "Delete",
          action: function(elmm, d, i) {
            if (d.type == "group") {
              //delete Group
              var objData = self.model.getValue().data;
              var children = self.removeGroup(objData, d.name);
              self.model.setValue("data", objData);
              self.draw("top");
            } else if (d.type == "data") {
              //delete Datalist
              deleteDatalistFromDialog(d.name);
            } else if(d.type == undefined) {
              //delete trash
              deleteDatalistFromDialog(d);       
            }
          }
        }
      ];
      //delete data and save datas into database
      function deleteDatalist(name) {
        var index = -1;
        self.dlist.forEach(function(d, i) {
          if (d.name == name) {
            index = i;
          }
        });
        if (index != -1) {
          self.dlist.splice(index, 1);
        }
        var data = self.model.getValue().data;
        if (removeFromData(data, name) == true) {
          self.model.setValue("data", data);          
        }
        var trash = self.model.getValue().trash;
        var index = trash.indexOf(name);
        if (index != -1) {
          trash.splice(index, 1);
          self.model.setValue("trash", trash);
        }
        self.model.setValue("deleteData", name);
        self.draw("top");
      }
      //remove data from name
      function removeFromData(data, name) {
        var flg = false
        Object.keys(data).forEach(function(key) {
          var index = -1;
          data[key].forEach(function(d, i) {
            if (typeof d == 'object') {
              flg |= removeFromData(d);
            } else {
              if (d == name) index = i;
            }
          });
          if (index != -1) {
            data[key].splice(index, 1);
            flg = true;
          }
        });
        return flg;
      }
      //delete data using a dialog
      function deleteDatalistFromDialog(name) {
        setDeleteDialog(name);
        $( "div#deleteDialog" ).dialog({
          modal: true,
          buttons: {
            "はい": function(){
               var test = 1;
               $(this).dialog('close');
               deleteDatalist(name);
             },
            "いいえ": function(){
               var test = 1;
               $(this).dialog('close');
             }
          },
          open: function() {
          },
          close : function(event){
            $(this).dialog('destroy');
            $(event.target).remove();
            //使い捨て
          }
        });        
      }
      //confirm to delete
      function setDeleteDialog(name) {
        d3.select("div#div_head_table")
          .append("div")
          .attr("id", "deleteDialog")
          .attr("title", name + "を削除しますか？")
          .style("width", self.width/2 + "px");
      }
    },
    //draw tree datalist 
    draw: function(name) {
      var self = this;
      self.groupData = self.transformData(group, self.dlist);
      var groupData = self.getDataFromGroupName(name);
      self.appendSVG(groupData);
      self.drawTree(groupData);
    },
    //extract data from datalist using name
    getDataFromDatalist: function(name) {
      var self = this;
      var dlist = self.dlist;
      var ret = null;
      dlist.forEach(function(d) {
        if (d.name == name) {
          ret = d;
        }
      });
      return ret;
    },
    //get datas from a group name
    getDataFromGroupName:  function(groupName) {
      var i, element;
      var self = this;
      var path = self.searchPath(groupName);
      var newData = $.extend(true, {}, self.groupData);
      self.getGroupFromPath(newData, path)
      return newData;
    },
    //append svg
    appendSVG: function(groupData) {
      var self = this;
      var height = self.$el.find('#datalist').height();
      var width = self.$el.find('#datalist').width();
      self.width = width*0.8;
      if (self.svg != undefined) {
        self.svg.remove();
      }
      var count = 2;
      count += self.countData(groupData);
      self.svg = d3.select("div#div_head_table")
        .style("overflow-y","auto")
        .append("svg")
        .attr("width", function(d) {
          return width * 0.8;
        })
        .attr("height", function(d) {
          return count * self.rectHeight*2.5;
        });
    },
    //count datas in group
    countData: function(groupData) {
      var self = this;
      var count = 0;
      groupData.children.forEach(function(data) {
        count++;
        if (data.children != undefined) {
          count += self.countData(data);
        }   
      });
      return count;
    },
    //transform data into list structure
    transformData: function(group, dlist) {
      var self = this;
      var transData = {};
      transData = {"name": "top", "type": "top"};
      transData.children = [];
      appendChildren(transData, group)
      var trash = self.model.getValue().trash;
      appendDlist(transData, dlist, trash);      
      return transData;

      //append children
      function appendChildren(parent, children) {
        if (typeof children == "object") {        
          Object.keys(children).forEach(function(key) {
            var obj = {};
            //グループの場合
            obj.name = key;
            obj.type = "group"
            obj.parent = parent.name;
            obj.children = [];
            parent.children.push(obj);
            if (children[key].length == 0) {
              obj.empty = true;
            }
            children[key].forEach(function(child) {
              appendChildren(obj, child);
            });
          });        
        } else {
          var obj = {};
          obj.name = children;
          obj.type = "data"
          obj.parent = parent.name
          parent.children.push(obj);
        }
      }
      //append datalist
      function appendDlist(top, dlist, trash) {
        var data;
        dlist.forEach(function(d) {
          data = self.searchDataFromGroup(top, d.name);
          if (data == null) {
            if (trash.indexOf(d.name) == -1) {
              var obj = {};
              obj.name = d.name;
              obj.type = "data";
              obj.parent = top.name;
              obj.data = d;
              top.children.push(obj);
            }
          } else {
            data.data = d;
          }
        });
      }
    },
    //search data from name
    searchDataFromGroup: function(top, name) {
      var self = this;
      var data = null;
      if (top.name == name) {
        data = top;
      } else {        
        if (top.children != undefined) {
          top.children.forEach(function(d) {
            var ret = self.searchDataFromGroup(d, name);
            if (ret != null) {
              data = ret;
            }
          }); 
        }
      }
      
      return data;
    },
    //draw tree
    drawTree: function (data) {
      var self = this;
      makeNodes(data)
      drawRects(data);
      drawText();
      drawTrash();

      //draw trash
      function drawTrash() {
        var g = self.svg
          .append("g")
          .attr("class", "group")
          .attr("transform", function(d){
            return "translate("+ 0 + "," + self.rectHeight*2*(self.countData(data)+2) + ")";
          });
        g.append("rect")
          .attr("height", self.rectHeight*1.5)
          .attr("width", function(d) {
            return self.width;
          })
          .attr("y", -self.rectHeight / 1.5)
          .attr("fill", "red")
          .attr("id", "marker")
          .attr("class", "marker_trash")
          .style("fill-opacity", 0.2)
          .style("display", "none");
        g.append("rect")
          .attr("height", self.rectHeight)
          .attr("width", function(d) {
            return self.width;
          })
          .attr("y", -self.rectHeight / 1.5)
          .attr("fill", "white")
          .on("click", function(d) {
            showTrash();
          });
        g.append("text")
          .text("trash items")
          .attr("y", 0)
          .attr("x",15);

        //show trash
        function showTrash() {
          var trash = self.model.getValue().trash;
          var count = self.countData(data)+2;
          var drag = self.dragEvent(data);
          var g = self.svg.selectAll(".trash")
            .data(trash)
            .enter()
            .append("g")
            .attr("class", "trash")
            .attr("transform", function(d) {
              this.data = d;
              count++;
              return "translate("+ 20 + "," + self.rectHeight*2*count + ")";
            })
          g.append("rect")
            .attr("height", self.rectHeight)
            .attr("width", function(d) {
              return self.width;
            })
            .attr("fill", "grey")
            .attr("y", -self.rectHeight / 1.5)
            .call(drag)
            .on("contextmenu", d3.contextMenu(self.menu));
          g.append("text")
            .text(function(d) {
              return self.getTextFromObject(self.getDataFromDatalist(d));
            })
           .attr("y", 0)
           .attr("x",15);
          self.svg.attr("height", function(d) {
             return count * self.rectHeight*2.5;
           });
        }
      }
      
      //make nodes from datas
      function makeNodes(data) {
        var i = 0;
        var tree = d3.layout.tree()
          .nodeSize([50, self.rectHeight]);
        var nodes = tree.nodes(data);

        self.svg.selectAll(".node")
          .data(nodes, function(d) {
             return d.id || (d.id = ++i);
          })
          .enter()
          .append("g")
          .attr("class", function(d) {
            this.data = d.name;
            if (d.type == "group" || d.type == "top") {
              return "group"
            } else {
              return "node";
            }
          })
          .attr("id", function(d) {
            return "group"+d.id;
          })
          .attr("transform", function(d){ 
            return "translate("+ d.y + "," + d.id * self.rectHeight*2 + ")";
          });
        var links = tree.links(nodes); 
        var prev = 0;
        var diagonal = d3.svg.diagonal()
          .projection(function(d){ 
            if (d.id != undefined) {
              prev = d.id*self.rectHeight*2;
              return [d.y,prev];
            } else {
              return [d.y,prev];
            }
          }); // 横向きにするためにxとyを逆に。
        //linksで作ったsource、targetでdiagonal曲線を作る。
        self.svg.selectAll(".link")
         .data(links)
         .enter()
         .append("path")
         .attr("class","link")
         .attr("fill", "none")
         .attr("stroke", "white")
         .attr("d",diagonal);    
      } 

      //draw rect     
      function drawRects(data) {
        var i = 0;
        var drag = self.dragEvent(data);
        var node = self.svg.selectAll("g");
        self.svg.selectAll("g.group").append("rect")
          .attr("class", "draggable")
          .style("cursor", "crosshair")
          .attr("y", -self.rectHeight / 1.5)
          .attr("height", self.rectHeight*1.5)
          .attr("width", function(d) {
            return self.width - d.y ;//+ self.layout.main.margin.right;
          })
          .attr("fill",function(d) {
            return "red";	 
        })
        .attr("id", "marker")
        .style("fill-opacity", 0.2)
        .style("display", "none");

        node.append("rect")
          .attr("class", "draggable")
          .style("cursor", "crosshair")
          .attr("y", -self.rectHeight / 1.5)
          .attr("height", self.rectHeight)
          .attr("width", function(d) {
            return self.width - d.y;
          })
          .attr("id", function(d) {
            return d.name;
          })
          .attr("fill",function(d) {
            if (d.type == "top") {
              return "white";
            } else if (d.type == "group") {       
              return "yellow";
            } else {
              return "grey";
            }
          })
          .style("fill-opacity", function(d) {
            if (d.empty == true) {
              return 0.1;
            } else {
              return 1.0;
            }
          })
          .attr("transform", "translate(0,0)")
          .call(drag)
          .on("dblclick", function(d) {
            if (d.type == "data") {
              var row_id = self.search_row_id(d.name);
              var row_format = "default";
              framework.mediator.trigger( 'headerview:datalistid', row_id.toString());
              framework.mediator.trigger( 'middleview:selectedData',
                                   { id: JSON.stringify(row_id), format: row_format } );              
            }
          }) 
          .on("click", function(d) {
            if (d.type == "group" && d.empty == undefined) {
              self.draw(d.name);
            }
          })
          .on("contextmenu", function(d) {
            if (d.type != "top") {
              return d3.contextMenu(self.menu)(d);
            }
          });
      }      
      //draw text (append text to rect)
      function drawText() {
        var node = self.svg.selectAll("g");
        node.append("text")
         .text(function(d) { 
          if (d.type != "data") {
            return d.name
          } else {
            return self.getTextFromObject(d.data);
          } 
        })
        .attr("y",0)
        .attr("x",15);
      }      
    },
    //get text from object (name + day + ...)
    getTextFromObject: function(obj) {
      var self = this;
      var text = "";
      Object.keys(obj).map(function(key) {	
        text += obj[key] + "   ";
      });
      return text;
    },
    //drag event
    dragEvent: function(data) {
      var self = this;
      var event = d3.behavior.drag()
        .on("dragstart", function(d) {
          if (d.type != "top") {
            d3.event.sourceEvent.stopPropagation();
            self.svg.selectAll("g.group").selectAll("rect#marker")
              .style("display", "block");
          }
        })
        .on("drag", function(d) {
          if (d.type != "top") {
            var dx = d3.event.x;   
            var dy = d3.event.y;   
            d3.select(this).attr("transform", "translate("+ dx + "," + dy + ")");
            d3.select(this.parentElement).select("text")
              .attr("y", dy)
              .attr("x", 15 + dx); 
           }
        })
        .on("dragend", function(d) {
          var group = self.getGroupFromCoordinate(this);
          if (group != null) {
            var groupName;
            if (group.classList.contains("marker_trash")) {
              groupName = null;
            } else {
              groupName = getGroupNameFromDom(group);
            }
            var nodeName = getGroupNameFromDom(this);            
            if (nodeName != groupName) {            
              self.moveGroup(groupName, nodeName);
            }
          }

          self.svg.selectAll("g.group").selectAll("rect#marker")
            .style("display", "none")
          d3.select(this).attr("transform", "translate(0,0)");
          d3.select(this.parentElement).select("text")
            .attr("y", 0)
            .attr("x", 15);
        });
      return event;
    
      //get group name from dom
      function getGroupNameFromDom(group) {
        var element = group.parentNode;
        return element.data;
      } 
    },
    //search data from trash
    searchDataFromTrash: function(name) {
      var self = this;
      var trash = self.model.getValue().trash;
      if (trash.indexOf(name) != -1) {
        var obj = {};
        obj.type = "data";
        obj.name = name;
        return obj;
      }
      return null;
    },
    //search data from name
    searchDataFromName: function(data, name) {
      var self = this;
      var ret = null;
      var i,
        children,
        tmp;
      if (data.name == name) {
        ret =  data;
      } else {
        children = data.children;
        if (children != undefined) {
          for (i = 0; i < children.length; i++) {
            tmp = self.searchDataFromName(children[i], name);
            if (tmp != null) {
              ret = tmp;
              break;
            }
          }
        }
      }
      return ret;
    },
    //search parenet name from child name
    searchParentNameFromName: function(data, name) {
      var self = this;
      var node = self.searchDataFromName(data, name);
      return node.parent;
    },
    //search parent data from a child name
    searchParentDataFromName: function(data, name) {
      var self = this;
      var parentName = self.searchParentNameFromName(data, name);
      return self.searchDataFromName(data, parentName);
    },
    //move node into a group
    moveGroup: function(groupName, nodeName) {
      var self = this;
      var groupData = self.groupData;
      var objData = self.model.getValue().data;
      var children = self.removeGroup(objData, nodeName);	
      var trash = self.model.getValue().trash;
      if (groupName != null) {
        self.addGroup(objData, groupName, nodeName, children);
        var index = trash.indexOf(nodeName); 
        if (index != -1) {
          trash.splice(index, 1);
          self.model.setValue("trash", trash);
        }
      } else {
        if (self.dlist.map(function(d) {return d.name}).indexOf(nodeName) != -1) {
          //datalistに含まれているデータであればゴミ箱にいれる
          //user defined groupは完全削除
          trash.push(nodeName);
          self.model.setValue("trash", trash);
        }
      }      
      self.model.setValue("data", objData);
      self.draw("top");
    },
    //remove group
    removeGroup: function(objData, nodeName) {
      var self = this;
      var obj = searchObj(objData, nodeName);
      return obj;
      function searchObj(datas, nodeName) {
        var obj = null;
        Object.keys(datas).forEach(function(key) {
          var i;
          if (key == nodeName) {
            obj = $.extend([], datas[key]);
            delete datas[key];
          } else {
            for (i = 0; i < datas[key].length; i++) {
              if (typeof datas[key][i] == "object") {
                Object.keys(datas[key][i]).forEach
                var tmp = searchObj(datas[key][i], nodeName);
                if (tmp != null) {
                  if (tmp.length == 0) {
                    datas[key].splice(i, 1);
                    break;
                  }
                  obj = tmp;
                }
              } else {
                if (datas[key][i] == nodeName) {
                  datas[key].splice(i, 1);
                  break;
                }
              }
            }
          }
        });
        return obj;
      }
    },
    //add node into group
    addGroup: function(objData, groupName, nodeName, children) {
       var self = this;
       Object.keys(objData).forEach(function(key) {
         if (groupName == key) {
           var data = self.searchDataFromName(self.groupData, nodeName);
           if (data == null) {
             //ゴミ箱から検索
             data = self.searchDataFromTrash(nodeName);
           }
           if (data.type == 'group') {
             var obj = {};
             if (children != null) {
               obj[nodeName] = children;
             } else {
               obj[nodeName] = [];
             }
             objData[key].push(obj); 
           } else if(data.type == "data") {
             objData[key].push(nodeName);
           }
         } else {
           objData[key].forEach(function(d) {
             if (typeof d == "object") {
               self.addGroup(d, groupName, nodeName, children);
             }
           });
         }
       });
    },
    //get group name from a coodinate
    getGroupFromCoordinate: function(target) {
      var self = this;
      var position = target.getBoundingClientRect(); 
      var group = null;
      d3.selectAll("rect#marker")[0].forEach(function(d) {
        var p = d.getBoundingClientRect();
        if (position.top >= p.top && position.bottom <= p.bottom
          && position.left >= p.left) {
          group = d;
        }
      });
      return group;
    },
    //search row id from name
    search_row_id: function(name) {
      var self = this;
      var i = 0;
      var dlist = self.dlist;
      for (i = 0; i < dlist.length; i++) {
        if (dlist[i].name ==  name) {
          return dlist[i];
        }
      }
      return null;
    },
    //search path from name
    searchPath: function(name) {
      var self = this;
      var groupData = self.groupData;
      var path = [];
      getPath(groupData, name, path);
      return path;

      function getPath(groupData, name, path) {
        var flg = false;
        if (groupData.type == "group" || groupData.type == "top") {
          if (groupData.name == name) {
            path.push(name);
            flg = true;
          } else {
            groupData.children.forEach(function(child) {
              if (getPath(child, name, path) == true) {
                path.push(child.parent);
                flg = true;
              }
            });
          }
        }
        return flg;
      }
    },
    //get group from path
    getGroupFromPath: function(groupData, path) {
      var self = this;
      var index = -1;
      var d_cand = [];
      var obj={};
      groupData.children.forEach(function(child, index) {
        if (path.indexOf(child.name) != -1) {
          if (child.type == "group") {
            self.getGroupFromPath(child, path);
          }
        } else {
          d_cand.push(index);
        }
      });
      d_cand.forEach(function(i) {
        if (groupData.children[i].type == "group") {
          groupData.children[i].children = [];
        }
      });
    },
    //register new group into database
    registerGroup: function(ev) {
      var self = this;
      var obj = {};
      var val = this.$el.find('input.grouping').val()
      if (val != '' && 
        !self.isIncludedInGroupData(self.groupData, val)) {
        obj[val] = [];
        var data = this.model.getValue().data;
        $.extend(data, obj)
        this.model.setValue("data", data);
        self.draw("top");
      }
    },
    //Is this name included in group?
    isIncludedInGroupData: function(groupData, name) {
      var self = this;
      var flg = false;
      if (groupData.name == name) {
        flg = true;
      } else {
        if (groupData.type == "group" || 
          groupData.type == "top") {
          groupData.children.forEach(function(child) {
            flg |= self.isIncludedInGroupData(child, name);
          });
        }
      }
      return flg;
    }
  });
  return MyClass;
});
