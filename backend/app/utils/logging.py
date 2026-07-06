import logging
import json
import time

class JsonFormatter(logging.Formatter):
    def format(self, record):
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created))
        log_record = {
            "timestamp": timestamp,
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module
        }
        
        standard_attrs = {
            'args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
            'funcName', 'levelname', 'levelno', 'lineno', 'module',
            'msecs', 'message', 'msg', 'name', 'pathname', 'process',
            'processName', 'relativeCreated', 'stack_info', 'thread', 'threadName'
        }
        for key, value in record.__dict__.items():
            if key not in standard_attrs:
                log_record[key] = value
                
        return json.dumps(log_record)

def setup_logger(log_level="INFO"):
    logger = logging.getLogger("app")
    logger.setLevel(logging.getLevelName(log_level))
    
    logger.handlers.clear()
    
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    return logger

logger = setup_logger()
