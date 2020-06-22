# Polysector help

The visualization platform seperate main functionalities into several parts.  **DataManager** get data from worker in Backend server, and get previous operations from and send current operations to frontend server. **ColorManager** computate and distribute colors according to data and chart properties. **Controler** is the mediator platform and charts. 

Besides the above three parts, the more flexible parts is **Chart** and **Worker**, which can be customized to implement kinds of business logics.

(here is the figure of the whole architecture to be add)

## [DataManager API](./DataManagerAPI.html)
## [ColorManager API](./ColorManagerAPI.html)
## [Controler API](./ControlerAPI.html)
## [Chart API](./ClientAPI.html)
## [Worker API](./WorkerAPI.html)

# Update History
## 2018/12/4: 6000次元並行座標次元可視化（ParallelCoordinatesHighDim)チャートを追加