from Worker import Worker
 
class Worker_CSVTSV(Worker):
  
  @property
  def type(self):
    return "TABLE"

  def _template(self, options):
    template_instance = None
    with open('control.html', 'r') as control_template_file:
      template_instance = control_template_file.read()
    return template_instance

  def _callback_logic(self, options):
    print(options)
    data = []
    try:
      with open('./data/pcDummyData_200x1000.csv', 'br') as data_file:
        data= data_file.read()
    except Exception:
      self.logger.error('Failed!', exc_info=True)
    return data

  def sync_process(self, options=None, entrance=None, filename=None):
    response = self.response #response keys of _table_ and _template_ has been defined

    response["_template_"] = self._template(options)
    response["_table_"]["big"] = self.BIG["NONE"]
    response["_table_"]["format"] = "csv"
    response["_table_"]["binary"] = True
    
    response["_table_"]["family"] = ['TABLE']
    response["_table_"]["filled"] = self._callback_logic(options)
    return response
