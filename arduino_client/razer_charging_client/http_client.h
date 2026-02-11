#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <AsyncTCP.h>

class Mouse;

class Http_client
{
public:
  Http_client(Mouse *mouse);
  static void my_onData(void* arg, AsyncClient* c, void* data, size_t len);
  static void my_onDisconnect(void* arg, AsyncClient* c);
  static void my_onConnect(void* arg, AsyncClient* c);
  static void my_onError(void* arg, AsyncClient* c, int8_t error);
  void connect();
  String payloadBuffer = "";
  int getRetry_counter();
  unsigned long getLastRequest();
  void reset_retry_counter();

private:
  AsyncClient *http_client = new AsyncClient();
  int retry_counter = 0;
  unsigned long lastRequest = 0;
};

#endif