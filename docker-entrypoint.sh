export PORT=${POLYSPECTOR_PORT}
export NODE_ENV="docker"

echo "starting Polyspector with port=${POLYSPECTOR_PORT}..."
echo env | grep -i poly

sleep 10


if [ "${POLYSPECTOR_MICROSERVICE}" = "true" ] && [ "${POLYSPECTOR_WORKER_DATALIST}" = "true" ]; then
    echo "starting Polyspector : worker : datalist"
    node server/backend/worker_datalist/main.js
fi

if [ "${POLYSPECTOR_WORKER_CSV}" = "true" ]; then
    echo "starting Polyspector : worker : csv"
    if [ "${POLYSPECTOR_MICROSERVICE}" = "true" ] ; then
	node server/backend/worker_csv/main.js 
    else
	node server/backend/worker_csv/main.js &
    fi
fi

if [ "${POLYSPECTOR_WORKER_CSVTSV}" = "true" ]; then
    echo "starting Polyspector : worker : csvtsv"
    if [ "${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
	node server/backend/worker_csvtsv/main.js 
    else
	node server/backend/worker_csvtsv/main.js &
    fi
fi

if [ "${POLYSPECTOR_WORKER_HIGHDIMS}" = "true" ]; then
    echo "Starting worker for highdims for P.C."
    if [ "${POLYSPECTOR_MICROSERVICE}" == "true" ]; then
	node server/backend/worker_csvtsv/main.js
    else
	node server/backend/worker_csvtsv/main.js &
    fi
fi


if [ "${POLYSPECTOR_WORKER_SQLITE}" = "true" ]; then
    echo "starting Polyspector : worker : sqlite"
    if ["${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
	node server/backend/sqlite/bootSQLiteWorkers.js
    else
	node server/backend/sqlite/bootSQLiteWorkers.js &
    fi
fi

if [ "${POLYSPECTOR_WORKER_PDB}" = "true" ]; then
    echo "starting Polyspector : worker : pdb"
    if ["${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
	node server/backend/pdb/bootPDBWorkers.js
    else
	node server/backend/pdb/bootPDBWorkers.js &
    fi
fi
if [ "${POLYSPECTOR_WORKER_BIGDATA}" = "true" ]; then
    echo "starting Polyspector : worker : bigdata"
    if ["${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
	node --max-old-space-size=8192 server/backend/workers_for_bigdata.js
    else
	node --max-old-space-size=8192 server/backend/workers_for_bigdata.js &
    fi
fi

if [ "${POLYSPECTOR_WORKER_ASAP}" = "true" ]; then
    echo "starting Polyspector : worker : asap"
    if ["${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
	node --max-old-space-size=8192 server/backend/workers_for_asap/workers.js
    else
	node --max-old-space-size=8192 server/backend/workers_for_asap/workers.js &
    fi
fi

if [ "${POLYSPECTOR_WORKER_MYSQL}" = "true" ]; then
    echo "starting Polyspector : worker : mysql"
    node server/backend/mysql/boot_datalist.js &
    node server/backend/mysql/boot_virtualtable.js &
fi

if [ "${POLYSPECTOR_WORKER_VENUS}" = "true" ]; then
    echo "starting Polyspector : worker : venus"
    node server/backend/onePackageSSD/CFDNIFWorker/venus.js &
fi

# hook point for customize
#hook#


# without start in order to run start.js in foreground mod

if [ "${POLYSPECTOR_MICROSERVICE}" = "true" ]; then
    if [ "${POLYSPECTOR_FRONTEND}" = "true" ]; then
	PORT=${POLYSPECTOR_PORT} node server/start.js
    fi
else
    PORT=${POLYSPECTOR_PORT} node server/start.js
fi
