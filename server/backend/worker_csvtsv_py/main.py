#!/usr/bin/python3

import logging, logging.config, configparser
import importlib

#import os, sys
from PikaConnector import PikaConnector

def main(rabbit_mq, relative_data_folder): #connect rabbitmq server

  p   = "workerclass.Worker_CSVTSV.py".rsplit('.', 1)[0]
  mod = importlib.import_module(p)
  WorkerClass = getattr(mod, p.rsplit('.')[-1])
  worker = WorkerClass(relative_data_folder)

  connector  = PikaConnector(worker, rabbit_mq) #"amqp://guest:guest@localhost:5672")
  try:
    connector.run()
  except (KeyboardInterrupt, Exception):
    logger.info('stop running! ')
    import traceback
    traceback.print_exc()
  finally:
    connector.stop()


if __name__ == "__main__":
  try:
    logging.config.fileConfig('logging.conf') # disable_existing_loggers=False)
    logger = logging.getLogger(__name__)

    config = configparser.ConfigParser()
    config.read('config.ini')
    default = config['DEFAULT']

    for key in default:
      logger.debug ( key + " = " + config.get('DEFAULT', key))

    rabbit_mq = 'amqp://' + default['mq_user'] +':' \
          + default['mq_password'] + '@' \
          + default['mq_host'] + ':'+ default['mq_port']

    logger.debug("rabbit_mq = {}".format(rabbit_mq))
    main(rabbit_mq, default["relative_data_folder"])
  except configparser.NoSectionError:
    logger.error("can not read config file")
