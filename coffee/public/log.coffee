root = exports ? (-> this.log = {})()

(->
  DEBUG	   = 10
  INFO	   = 20
  WARNING	 = 30
  ERROR	   = 30
  CRITICAL = 40

  cur_level = DEBUG

  root.set_level = (level) ->
    cur_level = level

  root.log = (level, s) ->
    if level >= cur_level
      console.log((new Date) + ' ' + s)

  root.debug = (s)  -> root.log(DEBUG, s)
  root.info = (s)   -> root.log(INFO, s)
  root.warn = (s)   -> root.log(WARN, s)
  root.error = (s)  -> root.log(ERROR, s)
  root.crit = (s)   -> root.log(CRIT, s)

  root.DEBUG	  = DEBUG
  root.INFO	    = INFO
  root.WARNING	= WARNING
  root.ERROR	  = ERROR
  root.CRITICAL = CRITICAL
)()