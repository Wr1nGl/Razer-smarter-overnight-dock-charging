#ifndef MOUSE_H
#define MOUSE_H

#include "http_client.h"

class Mouse
{
public:
  Mouse();

  void parse_data();
  void read_data();
  void loop(int timeout);
  void setMux(int state);
  int getCooldown_time();
  int getCharge_time();
  int getBattery_level();
  int getBattery_max_charge_level();
  float getCharge_gain();
  Http_client *getHttp_client();

private:
  int battery_level = 100;
  int battery_max_charge_level = 80;
  float charge_gain = 3.0;
  int charge_time = 10;
  int cooldown_time = 5;
  Http_client *http_client;
};

#endif