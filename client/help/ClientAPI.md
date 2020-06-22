

The visualization platform provides unified managment for charts --- provide and data management, color management, commuincations between server and charts.

# Chart Class Defination

The basic chart Class can be defined as:
```
define([...], function (...)
{
  var MyChartClass = function (io) { 
    ...
  }
  return MyChartClass;
});
```

The <font color="Gold">*io*</font> parameter in <font color="Gold">**MyChartClass**</font> constructor is the only entrance to access visualization platform. 

# Chart Constructor



