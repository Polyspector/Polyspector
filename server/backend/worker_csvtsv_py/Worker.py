import logging

class Worker(object):

  BIG = {'NONE': 0, 'ROW':1 , 'COLUMN':2, 'BOTH':3}

  def __init__(self, logger=None):
    self.logger = logging.getLogger(__name__)

  @property
  def name(self):
     return self.__class__.__name__.lower()

  @property
  def type(self):
    return self.name

  def vts(self):
      return [self.name]

  @property
  def response(self):
    return {"_table_":{}, "_template_": None}

  def sync_process(self, options=None, entrance=None, filename=None):
    pass

  def async_process(self, options=None, entrance=None, filename=None):
    pass
