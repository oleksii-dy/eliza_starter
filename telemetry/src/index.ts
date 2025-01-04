import { registerInstrumentations } from '@opentelemetry/instrumentation';
//import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
//import { trace } from '@opentelemetry/api';

import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { wrapTracer } from '@opentelemetry/api/experimental';

//Specify zipkin url. default url is http://localhost:9411/api/v2/spans
// docker run -d -p 9411:9411 openzipkin/zipkin
const zipkinUrl = 'http://localhost';
const zipkinPort = '9411';
const zipkinPath = '/api/v2/spans';
const zipkinURL = `${zipkinUrl}:${zipkinPort}${zipkinPath}`;

const options = {
    headers: {
	'module': 'mainai16z',
    },
    url: zipkinURL,
    serviceName: 'ai16z',

    // optional interceptor
    getExportRequestHeaders: () => {
	return {
            'module': 'mainai16z',
	}
    }
}
const traceExporter_zipkin = new ZipkinExporter(options);
const traceExporter = new ConsoleSpanExporter();
const txz=new SimpleSpanProcessor(traceExporter_zipkin);
const tx=new SimpleSpanProcessor(traceExporter);

try {
    const serviceName = 'eliza-agent';
    const provider = new NodeTracerProvider({
	resource: new Resource({
	  [ATTR_SERVICE_NAME]: serviceName,
	  [ATTR_SERVICE_VERSION]: '1.0',    }),
      spanProcessors: [
	txz,
	tx
	//	tx2
      ]
    });

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations(),
      new HttpInstrumentation(),
    ],
  });


  elizaLogger.log("setup!")
} catch(error){
  elizaLogger.log("ERROR",error)
}

